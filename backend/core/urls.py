from rest_framework.routers import DefaultRouter
from .views import (
    UniversityViewSet, DepartmentViewSet, BatchViewSet, SubjectViewSet, ExamViewSet,
    TeachingAssignmentViewSet,
)

router = DefaultRouter()
router.register('universities',         UniversityViewSet,         basename='university')
router.register('departments',          DepartmentViewSet,         basename='department')
router.register('batches',              BatchViewSet,              basename='batch')
router.register('subjects',             SubjectViewSet,            basename='subject')
router.register('exams',                ExamViewSet,               basename='exam')
router.register('teaching-assignments', TeachingAssignmentViewSet, basename='teaching-assignment')

urlpatterns = router.urls