import requests
from .services import PeopleCountingService
from django.utils import timezone
from .models import *

countingService = PeopleCountingService()

def count_one_camera(cameraId):
    try:
        camera = Camera.objects.prefetch_related('zones', 'auth').get(id=cameraId)
    except Camera.DoesNotExist:
        return
    analyzeCamera(camera)

def count_visitors():
    now = timezone.now()
    cameras = Camera.objects.prefetch_related('zones', 'auth')
    for camera in cameras:
        if not isWorkingTime(camera, now.time()):
            continue
        last = CameraAnalysis.objects.filter(camera=camera).first()
        if last:
            diff = (now - last.date).total_seconds() / 60
            if diff < camera.schedule:
                continue
        analyzeCamera(camera)

def isWorkingTime(camera, current_time):
    f = camera.from_time
    t = camera.to_time
    if f == t:
        return True
    elif f < t:
        return f <= current_time <= t
    else:
        return current_time >= f or current_time <= t

def analyzeCamera(camera):
    snapshot = getSnapshot(camera)
    if snapshot is None:
        return
    zonesCamera = list(camera.zones.all())
    zones = [{"name": z.name, "points": z.points} for z in zonesCamera]
    result = countingService.count(snapshot, zones)
    analysis = CameraAnalysis.objects.create(camera=camera, count=result['total'])
    zoneObjects = {z.name: z for z in zonesCamera}
    for zoneResult in result['zones']:
        zone = zoneObjects.get(zoneResult['name'])
        if zone:
            ZoneStatistics.objects.create(
                camera_analysis=analysis,
                zone=zone,
                count=zoneResult['count']
            )

def getSnapshot(camera):
    try:
        auth = None
        if hasattr(camera, 'auth'):
            auth = (camera.auth.login, camera.auth.password)
        response = requests.get(camera.url, auth=auth, timeout=10)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"[Camera {camera.name}] Ошибка получения снимка: {e}")
        return None