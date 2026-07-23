from rest_framework import viewsets, permissions
from .models import University, Department, Batch, Subject, Exam, TeachingAssignment
from .serializers import (
    UniversitySerializer, DepartmentSerializer,
    BatchSerializer, SubjectSerializer, ExamSerializer,
    TeachingAssignmentSerializer,
)


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'faculty')


class UniversityViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin can see their own university."""
    serializer_class = UniversitySerializer

    def get_queryset(self):
        return University.objects.filter(id=self.request.user.university_id)


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class   = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return Department.objects.filter(university=self.request.user.university)

    def perform_create(self, serializer):
        serializer.save(university=self.request.user.university)


class BatchViewSet(viewsets.ModelViewSet):
    serializer_class   = BatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return Batch.objects.filter(department__university=self.request.user.university)


# ── Subject ───────────────────────────────────────────────────────────────────
class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer

    def get_permissions(self):
        # Only admin can create / update / delete subjects
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdmin()]
        # Faculty and admin can read (list / retrieve)
        return [permissions.IsAuthenticated(), IsAdminOrFaculty()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'faculty':
            # Prefer subjects explicitly assigned to this faculty member.
            # Fall back to all subjects in their department so the pages work
            # even before an admin has made individual assignments.
            try:
                dept = user.faculty_profile.department
            except Exception:
                return Subject.objects.none()
            assigned = Subject.objects.filter(
                department__university=user.university,
                faculty=getattr(user, 'faculty_profile', None)
            )
            if assigned.exists():
                return assigned
            # No assignments yet → show whole department so faculty isn't stuck
            return Subject.objects.filter(department=dept)
        # Admin sees all subjects in their university
        return Subject.objects.filter(department__university=user.university)


# ── TeachingAssignment ──────────────────────────────────────────────────────
# This is the real, batch-level "who teaches whom" record. It is the single
# source of truth used by content.views (Mark/Attendance) to decide which
# faculty can view/create marks & attendance for which students. Subject.faculty
# is kept only as a display/coordinator field and no longer grants access.
class TeachingAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = TeachingAssignmentSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated(), IsAdminOrFaculty()]

    def get_queryset(self):
        user = self.request.user
        qs = TeachingAssignment.objects.filter(subject__department__university=user.university)
        if user.role == 'faculty':
            faculty_profile = getattr(user, 'faculty_profile', None)
            if not faculty_profile:
                return TeachingAssignment.objects.none()
            return qs.filter(faculty=faculty_profile)
        return qs


# ── Exam ──────────────────────────────────────────────────────────────────────
class ExamViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated(), IsAdminOrFaculty()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'faculty':
            from django.db.models import Q
            from core.models import Subject as SubjectModel
            try:
                dept = user.faculty_profile.department
            except Exception:
                return Exam.objects.none()

            # Subjects accessible to this faculty (assigned or department-wide fallback)
            assigned = SubjectModel.objects.filter(
                department__university=user.university, faculty=getattr(user, 'faculty_profile', None)
            )
            accessible_subjects = assigned if assigned.exists() else SubjectModel.objects.filter(department=dept)

            return Exam.objects.filter(university=user.university).filter(
                # Exam linked to one of faculty's subjects
                Q(subject__in=accessible_subjects)
                # OR exam has no subject but is for this department or university-wide
                | Q(subject__isnull=True, department=dept)
                | Q(subject__isnull=True, department__isnull=True)
            )
        return Exam.objects.filter(university=user.university)


    def perform_create(self, serializer):
        serializer.save(university=self.request.user.university)