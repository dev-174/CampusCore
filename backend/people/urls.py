from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, FacultyViewSet, ParentViewSet

router = DefaultRouter()
router.register('students', StudentViewSet, basename='student')
router.register('faculty',  FacultyViewSet, basename='faculty')
router.register('parents',  ParentViewSet,  basename='parent')

urlpatterns = router.urls
