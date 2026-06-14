from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Q, Prefetch, OuterRef, Subquery
from django.http import HttpResponse, StreamingHttpResponse
from rest_framework.views import APIView, PermissionDenied
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import permissions
from django_q.tasks import async_task
from rest_framework import status
from .serializers import *
from .services import *
from .models import *
import requests
import time
import json

def lastCameraAnalysis(count=1, related_name="analysis"):
    return Prefetch(related_name,
        queryset=CameraAnalysis.objects.filter(
            id__in=Subquery(CameraAnalysis.objects.filter(
                camera_id=OuterRef("camera_id")).values("id")[:count])),
        to_attr="last_analysis")

def lastZoneStat(count=1, related_name="statistics"):
    return Prefetch(related_name,
        queryset=ZoneStatistics.objects.filter(
            camera_analysis_id__in=Subquery(CameraAnalysis.objects.filter(
                camera_id=OuterRef("zone__camera_id")).values("id")[:count])
                ).order_by("-camera_analysis__date"),
        to_attr="last_statistics")

class CameraListView(APIView):
    def get(self, request):
        cameras = Camera.objects.filter(user=request.user).prefetch_related(lastCameraAnalysis(), 
            Prefetch("zones", queryset=Zone.objects.prefetch_related(lastZoneStat())))
        serializer = CameraInfoSerializer(cameras, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = CameraWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        camera = serializer.save(user=request.user)
        async_task('backend_api.tasks.count_one_camera', camera.id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class CameraDetailView(APIView):
    def get_object(self, pk, user):
        try:
            camera = Camera.objects.get(pk=pk)
        except Camera.DoesNotExist:
            return None
        if camera.user != user and not user.is_staff:
            raise PermissionDenied()
        return camera

    def get(self, request, pk):
        try:
            camera = Camera.objects.prefetch_related("zones").get(pk=pk)
        except Camera.DoesNotExist:
            return Response({"error": "Камера не найдена"}, status=status.HTTP_404_NOT_FOUND)
        if camera.user != request.user and not request.user.is_staff:
            raise PermissionDenied()
        serializer = CameraDetailSerializer(camera)
        return Response(serializer.data)

    def patch(self, request, pk):
        camera = self.get_object(pk, request.user)
        if not camera:
            return Response({"error": "Камера не найдена"}, status=status.HTTP_404_NOT_FOUND)
        serializer = CameraDetailSerializer(camera, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
        
    def delete(self, request, pk):
        camera = self.get_object(pk, request.user)
        if not camera:
            return Response({"error": "Камера не найдена"}, status=status.HTTP_404_NOT_FOUND)
        camera.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CameraNameListView(APIView):
    def get(self, request):        
        cameras = Camera.objects.filter(user=request.user).prefetch_related("zones").all()
        serializer = CameraNameSerializer(cameras, many=True)
        return Response(serializer.data)

class WidgetListView(APIView):
    def get_widgets(self, user):
        return Widget.objects.filter(
            Q(widget_cameras__camera__user=user) |
            Q(widget_zones__zone__camera__user=user)
        ).distinct()
    
    def get_object(self, pk, user):
        try:
            widget = Widget.objects.get(pk=pk)
        except Widget.DoesNotExist:
            return None
        if not user.is_staff:
            has_access = (
                widget.widget_cameras.filter(camera__user=user).exists() or
                widget.widget_zones.filter(zone__camera__user=user).exists()
            )
            if not has_access:
                raise PermissionDenied()
        return widget
        
    def get(self, request):# .select_related("histogram_config")
        widgets = self.get_widgets(request.user).prefetch_related(
            Prefetch(
                "widget_cameras",
                queryset=WidgetCamera.objects.prefetch_related(
                    lastCameraAnalysis(2, "camera__analysis")
                ).select_related("camera")
            ),
            Prefetch(
                "widget_zones",
                queryset=WidgetZone.objects.select_related("zone", "zone__camera").prefetch_related(
                    lastZoneStat(2, "zone__statistics")
                )
            )
        )
        serializer = WidgetInfoSerializer(widgets, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = WidgetWriteSerializer(data=request.data)

        camera_ids = [c["camera_id"] for c in request.data.get("cameras", [])]
        if Camera.objects.filter(id__in=camera_ids).exclude(user=request.user).exists():
            raise PermissionDenied()

        zone_ids = [z["zone_id"] for z in request.data.get("zones", [])]
        if Zone.objects.filter(id__in=zone_ids).exclude(camera__user=request.user).exists():
            raise PermissionDenied()
        
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def delete(self, request, pk):
        widget = self.get_object(pk, request.user)
        if not widget:
            return Response({"error": "Камера не найдена"}, status=status.HTTP_404_NOT_FOUND)
        widget.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
        })

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = AuthTokenSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
        })

class LogoutView(APIView):
    def post(self, request):
        request.user.auth_token.delete()
        return Response({"detail": "Logged out"})

class WidgetTokenView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request, token):
        try:
            widget = Widget.objects.prefetch_related( # .select_related("histogram_config")
                Prefetch(
                    "widget_cameras",
                    queryset=WidgetCamera.objects.select_related("camera").prefetch_related(
                        lastCameraAnalysis(2, "camera__analysis")
                    )
                ),
                Prefetch(
                    "widget_zones",
                    queryset=WidgetZone.objects.select_related("zone", "zone__camera").prefetch_related(
                        lastZoneStat(2, "zone__statistics")
                    )
                )
            ).get(token=token)
        except Widget.DoesNotExist:
            return Response({"detail": "Виджет не найден."}, status=404)
        serializer = WidgetTokenSerializer(widget)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def sse_widget(request, token):
    def event_stream():
        while True:
            widget_fresh = Widget.objects.prefetch_related(
                Prefetch(
                    "widget_cameras",
                    queryset=WidgetCamera.objects.prefetch_related(
                        lastCameraAnalysis(2, "camera__analysis")
                    ).select_related("camera")
                ),
                Prefetch(
                    "widget_zones",
                    queryset=WidgetZone.objects.select_related("zone", "zone__camera").prefetch_related(
                        lastZoneStat(2, "zone__statistics")
                    )
                )
            ).get(token=token)
            result = {"cameras": [], "zones": []}
            for wc in widget_fresh.widget_cameras.all():
                analyses = list(wc.camera.analysis.all())
                count = analyses[0].count if analyses else 0
                if len(analyses) < 2:
                    trend = None
                else:
                    diff = analyses[0].count - analyses[1].count
                    trend = f"+{diff}" if diff >= 0 else str(diff)
                result["cameras"].append({
                    "camera_id": wc.camera.id,
                    "count": count,
                    "trend": trend,
                })
            for wz in widget_fresh.widget_zones.all():
                stats = list(wz.zone.statistics.all())
                count = stats[0].count if stats else 0
                if len(stats) < 2:
                    trend = None
                else:
                    diff = stats[0].count - stats[1].count
                    trend = f"+{diff}" if diff >= 0 else str(diff)
                result["zones"].append({
                    "zone_id": wz.zone.id,
                    "count": count,
                    "trend": trend,
                })
            yield f"data: {json.dumps(result)}\n\n"
            time.sleep(30)
    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    return response

@api_view(['GET'])
def sse_cameras(request):
    def event_stream():
        lastIds = {}
        while True:
            token = request.GET.get("token")
            user = Token.objects.get(key=token).user
            cameras = Camera.objects.filter(user=user).prefetch_related(
                lastCameraAnalysis(),
                Prefetch("zones", queryset=Zone.objects.prefetch_related(lastZoneStat()))
            )
            result = []
            for camera in cameras:
                if not camera.last_analysis:
                    continue
                latest = camera.last_analysis[0]
                if lastIds.get(camera.id) == latest.id:
                    continue
                lastIds[camera.id] = latest.id
                result.append({
                    'camera_id': camera.id,
                    'count': latest.count,
                    'zones': [
                        {
                            'zone_id': zs.zone.id,
                            'count': zs.count
                        }
                        for zone in camera.zones.all()
                        for zs in zone.last_statistics
                    ]
                })
            if result:
                yield f"data: {json.dumps(result)}\n\n"
            time.sleep(30)
    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    return response

@api_view(['GET'])
def sse_widgets(request):
    def event_stream():
        while True:
            token = request.GET.get("token")
            user = Token.objects.get(key=token).user
            widgets_fresh = Widget.objects.filter(
                Q(widget_cameras__camera__user=user) |
                Q(widget_zones__zone__camera__user=user)
            ).distinct().prefetch_related(
            Prefetch(
                "widget_cameras",
                queryset=WidgetCamera.objects.prefetch_related(
                    lastCameraAnalysis(2, "camera__analysis")
                ).select_related("camera")
            ),
            Prefetch(
                "widget_zones",
                queryset=WidgetZone.objects.select_related("zone", "zone__camera").prefetch_related(
                    lastZoneStat(2, "zone__statistics")
                    )
                )
            )
            result = []
            for widget in widgets_fresh:
                cameras = []
                for wc in widget.widget_cameras.all():
                    analyses = list(wc.camera.analysis.all())
                    count = analyses[0].count if analyses else 0
                    if len(analyses) < 2:
                        trend = None
                    else:
                        diff = analyses[0].count - analyses[1].count
                        trend = f"+{diff}" if diff >= 0 else str(diff)
                    cameras.append({"camera_id": wc.camera.id, "count": count, "trend": trend})
                zones = []
                for wz in widget.widget_zones.all():
                    stats = list(wz.zone.statistics.all())
                    count = stats[0].count if stats else 0
                    if len(stats) < 2:
                        trend = None
                    else:
                        diff = stats[0].count - stats[1].count
                        trend = f"+{diff}" if diff >= 0 else str(diff)
                    zones.append({"zone_id": wz.zone.id, "count": count, "trend": trend})
                result.append({"widget_id": widget.id, "cameras": cameras, "zones": zones})
            yield f"data: {json.dumps(result)}\n\n"
            time.sleep(30)

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    return response

@api_view(['GET'])
def camera_snapshot(request, camera_id):
    try:
        camera = Camera.objects.select_related("auth").get(id=camera_id)
        if camera.user != request.user and not request.user.is_superuser:
            raise PermissionDenied()
        content, content_type = getSnapshot(camera)
        if content is None:
            return HttpResponse(status=502)
        response = HttpResponse(content, content_type=content_type)
        response['Cache-Control'] = 'no-store'
        return response
    except Camera.DoesNotExist:
        return HttpResponse(status=404)

@api_view(['GET'])
def camera_snapshot_url(request):
    url = request.query_params.get('url')
    if not url:
        return HttpResponse(status=400)
    content, content_type = fetch_snapshot(url)
    if content is None:
        return HttpResponse(status=502)
    response = HttpResponse(content, content_type=content_type)
    response['Cache-Control'] = 'no-store'
    return response