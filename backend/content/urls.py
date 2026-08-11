from rest_framework.routers import DefaultRouter
from .views import MarkViewSet, AttendanceViewSet, NoticeViewSet, ResourceViewSet

router = DefaultRouter()
router.register('marks',      MarkViewSet,       basename='mark')
router.register('attendance', AttendanceViewSet,  basename='attendance')
router.register('notices',    NoticeViewSet,      basename='notice')
router.register('resources',  ResourceViewSet,    basename='resource')

urlpatterns = router.urls
