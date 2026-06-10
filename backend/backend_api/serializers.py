from django.contrib.auth.models import User
from rest_framework import serializers
from .models import *

class ZoneDetailSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    class Meta:
        model = Zone
        fields = ["id", "name", "points"]
    
class CameraDetailSerializer(serializers.ModelSerializer):
    zones = ZoneDetailSerializer(many=True)
    from_time = serializers.TimeField(format='%H:%M')
    to_time = serializers.TimeField(format='%H:%M')
    
    class Meta:
        model = Camera
        fields = ["id", "name", "url", "schedule", "from_time", "to_time", "zones"]
    
    def validate_zones(self, value):
        names = [zone["name"] for zone in value]
        if len(names) != len(set(names)):
            raise serializers.ValidationError("Названия зон должны быть уникальными в рамках одной камеры.")
        return value

    def update(self, instance, validated_data):
        zones_data = validated_data.pop("zones", None)
        instance = super().update(instance, validated_data)
        if zones_data is not None:
            instance_zone_ids = {z.id: z for z in instance.zones.all()}
            new_zone_ids = set()
            for zone_data in zones_data:
                zone_id = zone_data.get("id")
                if zone_id and zone_id in instance_zone_ids:
                    zone = instance_zone_ids[zone_id]
                    zone.name = zone_data.get("name", zone.name)
                    zone.points = zone_data.get("points", zone.points)
                    zone.save()
                    new_zone_ids.add(zone_id)
                else:
                    zone = Zone.objects.create(camera=instance, **zone_data)
                    new_zone_ids.add(zone.id)
            for zone_id, zone in instance_zone_ids.items():
                if zone_id not in new_zone_ids:
                    zone.delete()
        return instance

class ZoneInfoSerializer(serializers.ModelSerializer):
    last_count = serializers.SerializerMethodField()
    class Meta:
        model = Zone
        fields = ["id", "name", "points", "last_count"]
    
    def get_last_count(self, obj):
        last = obj.last_statistics[0] if obj.last_statistics else None
        return last.count if last else 0

class CameraInfoSerializer(serializers.ModelSerializer):
    last_count = serializers.SerializerMethodField()
    zones = ZoneInfoSerializer(many=True, read_only=True)
    from_time = serializers.TimeField(format='%H:%M')
    to_time = serializers.TimeField(format='%H:%M')
    class Meta:
        model = Camera
        fields = ["id", "name", "url", "active", "schedule", "from_time", "to_time", "last_count", "zones"]
    
    def get_last_count(self, obj):
        last = obj.last_analysis[0] if obj.last_analysis else None
        return last.count if last else 0

class ZoneNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = ["id", "name"]

class CameraNameSerializer(serializers.ModelSerializer):
    zones = ZoneNameSerializer(many=True, read_only=True)
    class Meta:
        model = Camera
        fields = ["id", "name", "zones"]

class ZoneWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = ["name", "points"]
    
    def validate_points(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("points должен быть массивом.")
        if len(value) < 3 or len(value) > 10:
            raise serializers.ValidationError("Полигон должен содержать минимум 3 и максимум 10 точек.")
        for point in value:
            if not isinstance(point, dict) or "x" not in point or "y" not in point:
                raise serializers.ValidationError("Каждая точка должна быть объектом с полями x и y.")
            x, y = point["x"], point["y"]
            if not isinstance(x, int) or not isinstance(y, int):
                raise serializers.ValidationError("Значения x и y должны быть целыми числами.")
            if not (0 <= x <= 100):
                raise serializers.ValidationError(f"Значение x={x} выходит за пределы допустимого диапазона [0, 100].")
            if not (0 <= y <= 56):
                raise serializers.ValidationError(f"Значение y={y} выходит за пределы допустимого диапазона [0, 56].")
        return value

class CameraAuthSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraAuth
        fields = ["login", "password"]
        extra_kwargs = {"password": {"write_only": True}}
    
class CameraWriteSerializer(serializers.ModelSerializer): 
    zones = ZoneWriteSerializer(many=True, required=False, default=list)
    auth = CameraAuthSerializer(required=False)
    class Meta:
        model = Camera
        fields = ["name", "url", "schedule", "from_time", "to_time", "zones", "auth"]

    def validate_zones(self, value):
        names = [zone["name"] for zone in value]
        if len(names) != len(set(names)):
            raise serializers.ValidationError("Названия зон должны быть уникальными в рамках одной камеры.")
        return value
    
    def create(self, validated_data):
        zones_data = validated_data.pop("zones", [])
        auth_data = validated_data.pop("auth", None)
        camera = Camera.objects.create(**validated_data)
        Zone.objects.bulk_create([Zone(camera=camera, **z) for z in zones_data])
        if auth_data:
            CameraAuth.objects.create(camera=camera, **auth_data)
        return camera

# class HistogramConfigWriteSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = HistogramConfig
#         fields = ["schedule"]

class WidgetCameraWriteSerializer(serializers.ModelSerializer):
    camera_id = serializers.IntegerField()
    class Meta:
        model = WidgetCamera
        fields = ["camera_id", "capacity"]

class WidgetZoneWriteSerializer(serializers.ModelSerializer):
    zone_id = serializers.IntegerField()
    class Meta:
        model = WidgetZone
        fields = ["zone_id", "capacity"]

class WidgetWriteSerializer(serializers.ModelSerializer):
    cameras = WidgetCameraWriteSerializer(many=True, required=False, default=list)
    zones = WidgetZoneWriteSerializer(many=True, required=False, default=list)
    # histogram_config = HistogramConfigWriteSerializer(required=False)

    class Meta:
        model = Widget
        fields = ["name", "widget_type", "cameras", "zones"] #, "histogram_config"

    def validate(self, data):
        cameras = data.get("cameras", [])
        zones = data.get("zones", [])
        if not cameras and not zones:
            raise serializers.ValidationError("Выберите хотя бы одну камеру или зону.")
        if cameras and zones:
            camera_ids = {c["camera_id"] for c in cameras}
            zone_camera_ids = {
                Zone.objects.get(id=z["zone_id"]).camera_id for z in zones
            }
            if camera_ids & zone_camera_ids:
                raise serializers.ValidationError("Нельзя выбрать камеру и её зоны одновременно.")
        # if data.get("widget_type") == "histogram" and not data.get("histogram_config"):
        #     raise serializers.ValidationError("Для гистограммы необходимо указать период.")
        return data

    def create(self, validated_data):
        cameras_data = validated_data.pop("cameras", [])
        zones_data = validated_data.pop("zones", [])
        #histogram_config = validated_data.pop("histogram_config", None)

        widget = Widget.objects.create(**validated_data)

        # if histogram_config:
        #     HistogramConfig.objects.create(widget=widget, **histogram_config)

        WidgetCamera.objects.bulk_create([WidgetCamera(widget=widget, **cam) for cam in cameras_data])
        WidgetZone.objects.bulk_create([WidgetZone(widget=widget, **zone) for zone in zones_data])

        return widget

class WidgetCameraInfoSerializer(serializers.ModelSerializer):
    camera_id = serializers.IntegerField(source="camera.id")
    name = serializers.CharField(source="camera.name")    
    count = serializers.SerializerMethodField()
    trend = serializers.SerializerMethodField()
    class Meta:
        model = WidgetCamera
        fields = ["camera_id", "name", "capacity", "count", "trend"]

    def _get_last_analysis(self, obj):
        return getattr(obj.camera, "last_analysis", [])

    def get_count(self, obj):
        analyses = self._get_last_analysis(obj)
        return analyses[0].count if analyses else 0

    def get_trend(self, obj):
        analyses = self._get_last_analysis(obj)
        if len(analyses) < 2:
            return None
        diff = analyses[0].count - analyses[1].count
        return f"+{diff}" if diff >= 0 else str(diff)
    
class WidgetZoneInfoSerializer(serializers.ModelSerializer):
    zone_id = serializers.IntegerField(source="zone.id")
    name = serializers.pythonname = serializers.SerializerMethodField()
    count = serializers.SerializerMethodField()
    trend = serializers.SerializerMethodField()
    class Meta:
        model = WidgetZone
        fields = ["zone_id", "name", "capacity", "count", "trend"]

    def get_name(self, obj):
        camera_name = obj.zone.camera.name
        zone_name = obj.zone.name
        return f"{camera_name} - {zone_name}"

    def _get_last_statistics(self, obj):
        return getattr(obj.zone, "last_statistics", [])

    def get_count(self, obj):
        stat = self._get_last_statistics(obj)
        return stat[0].count if stat else 0

    def get_trend(self, obj):
        stat = self._get_last_statistics(obj)
        if len(stat) < 2:
            return None
        diff = stat[0].count - stat[1].count
        return f"+{diff}" if diff >= 0 else str(diff)

class WidgetInfoSerializer(serializers.ModelSerializer):
    cameras = WidgetCameraInfoSerializer(source="widget_cameras", many=True)
    zones = WidgetZoneInfoSerializer(source="widget_zones", many=True)
    #histogram_config = serializers.SerializerMethodField()
    class Meta:
        model = Widget
        fields = ["id", "name", "widget_type", "token", "cameras", "zones"]  # , "histogram_config"

    # def get_histogram_config(self, obj):
    #     config = getattr(obj, "histogram_config", None)
    #     if obj.widget_type == "histogram" and config:
    #         return config.schedule
    #     return None
    
class WidgetTokenSerializer(serializers.ModelSerializer):
    cameras = WidgetCameraInfoSerializer(source="widget_cameras", many=True)
    zones = WidgetZoneInfoSerializer(source="widget_zones", many=True)
    #histogram_config = serializers.SerializerMethodField()
    class Meta:
        model = Widget
        fields = ["name", "widget_type", "cameras", "zones"]  # , "histogram_config"

    # def get_histogram_config(self, obj):
    #     config = getattr(obj, "histogram_config", None)
    #     if obj.widget_type == "histogram" and config:
    #         return config.schedule
    #     return None

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "password")

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)