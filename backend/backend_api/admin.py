from django.contrib import admin
from .models import *

admin.site.register(Camera)
admin.site.register(CameraAuth)
admin.site.register(Zone)
admin.site.register(CameraAnalysis)
admin.site.register(ZoneStatistics)
admin.site.register(WidgetCamera)
admin.site.register(WidgetZone)
admin.site.register(Widget)