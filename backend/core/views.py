from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import University, Department, Batch, Subject, Exam, TeachingAssignment
from .permissions import IsAdmin, IsAdminOrFaculty
from people.models import StudentProfile, FacultyProfile
from content.models import Mark, Attendance, Resource
from .serializers import (
    UniversitySerializer, DepartmentSerializer,
    BatchSerializer, SubjectSerializer, ExamSerializer,
    TeachingAssignmentSerializer,
)


def get_faculty_accessible_subjects(user):
    """
    Returns accessible Subject queryset and department for a faculty user:
    assigned subjects if any exist, otherwise subjects in the faculty's department.
    Returns (Subject.objects.none(), None) if user has no faculty profile.
    """
    try:
        dept = user.faculty_profile.department
    except Exception:
        return Subject.objects.none(), None

    assigned = Subject.objects.filter(
        department__university=user.university,
        faculty=getattr(user, 'faculty_profile', None)
    )
    if assigned.exists():
        return assigned, dept
    return Subject.objects.filter(department=dept), dept



class UniversityViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin can see their own university."""
    serializer_class = UniversitySerializer

    def get_queryset(self):
        return University.objects.filter(id=self.request.user.university_id)


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class   = DepartmentSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Department.objects.filter(university=self.request.user.university)

    def perform_create(self, serializer):
        serializer.save(university=self.request.user.university)

    def destroy(self, request, *args, **kwargs):
        department = self.get_object()
        deps = []

        students_count = StudentProfile.objects.filter(department=department).count()
        if students_count > 0:
            deps.append(f"{students_count} student(s)")

        faculty_count = FacultyProfile.objects.filter(department=department).count()
        if faculty_count > 0:
            deps.append(f"{faculty_count} faculty member(s)")

        batches_count = department.batches.count()
        if batches_count > 0:
            deps.append(f"{batches_count} batch(es)")

        subjects_count = department.subjects.count()
        if subjects_count > 0:
            deps.append(f"{subjects_count} subject(s)")

        exams_count = Exam.objects.filter(department=department).count()
        if exams_count > 0:
            deps.append(f"{exams_count} exam(s)")

        resources_count = Resource.objects.filter(department=department).count()
        if resources_count > 0:
            deps.append(f"{resources_count} resource(s)")

        if deps:
            msg = f"Cannot delete department '{department.name}' because it is currently associated with {', '.join(deps)}."
            return Response({
                'error': msg,
                'detail': msg,
                'department': department.name,
                'dependencies': {
                    'students': students_count,
                    'faculty': faculty_count,
                    'batches': batches_count,
                    'subjects': subjects_count,
                    'exams': exams_count,
                    'resources': resources_count,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        return super().destroy(request, *args, **kwargs)


class BatchViewSet(viewsets.ModelViewSet):
    serializer_class   = BatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
#to show only ur uni.
    def get_queryset(self):
        return Batch.objects.filter(department__university=self.request.user.university)
#block delete if data is there
    def destroy(self, request, *args, **kwargs):
        batch = self.get_object()
        deps = []

        students_count = StudentProfile.objects.filter(batch=batch).count()
        if students_count > 0:
            deps.append(f"{students_count} student(s)")

        ta_count = batch.teaching_assignments.count()
        if ta_count > 0:
            deps.append(f"{ta_count} teaching assignment(s)")

        if deps:
            msg = f"Cannot delete batch '{batch.name}' because it is currently associated with {', '.join(deps)}."
            return Response({'error': msg, 'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        return super().destroy(request, *args, **kwargs)


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
            subjects, _ = get_faculty_accessible_subjects(user)
            return subjects
        return Subject.objects.filter(department__university=user.university)

    def destroy(self, request, *args, **kwargs):
        subject = self.get_object()
        deps = []

        ta_count = subject.teaching_assignments.count()
        if ta_count > 0:
            deps.append(f"{ta_count} teaching assignment(s)")

        exams_count = Exam.objects.filter(subject=subject).count()
        if exams_count > 0:
            deps.append(f"{exams_count} exam(s)")

        marks_count = Mark.objects.filter(subject=subject).count()
        if marks_count > 0:
            deps.append(f"{marks_count} mark record(s)")

        attendance_count = Attendance.objects.filter(subject=subject).count()
        if attendance_count > 0:
            deps.append(f"{attendance_count} attendance record(s)")

        if deps:
            msg = f"Cannot delete subject '{subject.name}' because it is currently associated with {', '.join(deps)}."
            return Response({'error': msg, 'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        return super().destroy(request, *args, **kwargs)


# ── TeachingAssignment ──────────────────────────────────────────────────────
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
            accessible_subjects, dept = get_faculty_accessible_subjects(user)
            if dept is None:
                return Exam.objects.none()

            return Exam.objects.filter(university=user.university).filter(
                Q(subject__in=accessible_subjects)
                | Q(subject__isnull=True, department=dept)
                | Q(subject__isnull=True, department__isnull=True)
            )
        return Exam.objects.filter(university=user.university)

    def perform_create(self, serializer):
        serializer.save(university=self.request.user.university)

    def destroy(self, request, *args, **kwargs):
        exam = self.get_object()
        marks_count = Mark.objects.filter(exam=exam).count()

        if marks_count > 0:
            msg = f"Cannot delete exam '{exam.title}' because it has {marks_count} student score record(s) associated with it."
            return Response({'error': msg, 'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        return super().destroy(request, *args, **kwargs)