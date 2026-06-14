import requests
from .services import PeopleCountingService, getSnapshot, isWorkingTime
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

def analyzeCamera(camera):
    content, _ = getSnapshot(camera)
    if content is None:
        return
    zonesCamera = list(camera.zones.all())
    zones = [{"name": z.name, "points": z.points} for z in zonesCamera]
    result = countingService.count(content, zones)
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