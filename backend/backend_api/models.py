from django.core.validators import MaxValueValidator, MinValueValidator
from encrypted_model_fields.fields import EncryptedCharField
from django.contrib.auth import get_user_model
from django.db import models
import uuid

User = get_user_model()

class Camera(models.Model):
    SCHEDULE_CHOICES = [
        (1, 'каждую минуту'),
        (5, 'каждые 5 минут'),
        (10, 'каждые 10 минут'),
        (15, 'каждые 15 минут'),
        (30, 'каждые 30 минут'),
        (60, 'каждый час'),
    ]
    name = models.CharField(max_length=255)
    url = models.URLField(max_length=2048)
    schedule = models.PositiveSmallIntegerField(choices=SCHEDULE_CHOICES, default=1)
    from_time = models.TimeField()
    to_time = models.TimeField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cameras')

    def __str__(self):
        return self.name

class CameraAuth(models.Model):
    camera = models.OneToOneField(Camera, on_delete=models.CASCADE,related_name="auth")
    login = models.CharField(max_length=255)
    password = EncryptedCharField(max_length=255)
    
    def __str__(self):
        return f"{self.camera.name} ({self.login})"
    
class Zone(models.Model):
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name="zones")
    name = models.CharField(max_length=255)
    points = models.JSONField(default=list)
    
    class Meta:
        constraints = [models.UniqueConstraint(fields=["camera", "name"], name="unique_zone_name_per_camera")]

    def __str__(self):
        return self.name
        
class CameraAnalysis(models.Model):
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name="analysis")
    date = models.DateTimeField(auto_now_add=True)
    count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ["-date"]
    
    def __str__(self):
        return self.camera.name

class ZoneStatistics(models.Model):
    camera_analysis = models.ForeignKey(CameraAnalysis, on_delete=models.CASCADE, related_name="zone_analysis")
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name="statistics")
    count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.zone.name

class Widget(models.Model):
    WIDGET_TYPES = [
        ("current", "Текущая посещаемость"),
        # ("histogram", "Гистограмма"),
    ]
    name = models.CharField(max_length=255)
    widget_type = models.CharField(max_length=32, choices=WIDGET_TYPES)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    def __str__(self):
        return f"{self.get_widget_type_display()} — {self.name}"

class WidgetCamera(models.Model):
    widget = models.ForeignKey(Widget, on_delete=models.CASCADE, related_name="widget_cameras")
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, related_name="camera_widgets")
    capacity = models.PositiveIntegerField(default=50, validators=[MinValueValidator(1), MaxValueValidator(100)])

    class Meta:
        unique_together = [['widget', 'camera']]

class WidgetZone(models.Model):
    widget = models.ForeignKey(Widget, on_delete=models.CASCADE, related_name="widget_zones")
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name="zone_widgets")
    capacity = models.PositiveIntegerField(default=10, validators=[MinValueValidator(1), MaxValueValidator(100)])

    class Meta:
        unique_together = [['widget', 'zone']]

# class HistogramConfig(models.Model):
#     SCHEDULE_CHOICES = [
#         ("6h",  "6 часов"),
#         ("1d",  "1 день"),
#         ("7d",  "7 дней"),
#         ("30d", "30 дней"),
#     ]
#     widget = models.OneToOneField(Widget, on_delete=models.CASCADE, related_name="histogram_config", limit_choices_to={"widget_type": "histogram"})
#     schedule = models.CharField(max_length=8, choices=SCHEDULE_CHOICES, default="1d")

#     def __str__(self):
#         return f"{self.widget.name} / {self.get_schedule_display()}"