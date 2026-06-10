from django.contrib import admin
from django.urls import path
from backend_api.views import *

urlpatterns = [
    path('admin/', admin.site.urls),
    path('cameras/<int:camera_id>/snapshot/', camera_snapshot),
    path('api/cameras/sse/', sse_cameras),
    path('api/widgets/sse/', sse_widgets),
    path('api/widget/<uuid:token>/sse/', sse_widget),
    path('api/cameras/', CameraListView.as_view()),
    path('api/cameras/names/', CameraNameListView.as_view()),
    path('api/cameras/<int:pk>/', CameraDetailView.as_view()),
    path('api/widgets/<int:pk>/', WidgetListView.as_view()),
    path('api/widgets/', WidgetListView.as_view()),
    path('api/widget/<uuid:token>/', WidgetTokenView.as_view()),
    path('auth/registration/', RegisterView.as_view()),
    path('auth/login/', LoginView.as_view()),
    path('auth/logout/', LogoutView.as_view()),
]