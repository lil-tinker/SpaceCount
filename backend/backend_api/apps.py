from django.apps import AppConfig

class BackendApiConfig(AppConfig):
    name = 'backend_api'

    def ready(self):
        try:
            from django_q.tasks import schedule
            from django_q.models import Schedule
            if not Schedule.objects.filter(name='count_visitors').exists():
                schedule(
                    'backend_api.tasks.count_visitors',
                    name='count_visitors',
                    schedule_type=Schedule.MINUTES,
                    minutes=1,
                )
        except Exception:
            pass