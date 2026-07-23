from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import Mark, Attendance, Notice, Resource
from .serializers import MarkSerializer, AttendanceSerializer, NoticeSerializer, ResourceSerializer


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'faculty'


class IsAdminOrFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'faculty')


def faculty_teaching_q(user, subject_field='subject', student_field='student'):
    """
    Build a Q object matching only the exact (subject, batch) pairs this
    faculty member is actually assigned to teach, via TeachingAssignment.
    This replaces the old department-wide access: a faculty member no longer
    sees/edits marks or attendance for a whole department just because they
    teach ONE subject to ONE batch in it.

    Returns None if the faculty has no faculty_profile or no assignments —
    callers should treat None as "no access" (return an empty queryset).
    """
    from core.models import TeachingAssignment
    faculty_profile = getattr(user, 'faculty_profile', None)
    if not faculty_profile:
        return None
    pairs = list(TeachingAssignment.objects.filter(faculty=faculty_profile).values_list('subject_id', 'batch_id'))
    if not pairs:
        return None
    q = Q()
    for subject_id, batch_id in pairs:
        q |= Q(**{f'{subject_field}_id': subject_id, f'{student_field}__batch_id': batch_id})
    return q


def faculty_can_teach(user, subject_id, batch_id):
    """Check whether this faculty is assigned to teach this exact subject+batch pair."""
    from core.models import TeachingAssignment
    faculty_profile = getattr(user, 'faculty_profile', None)
    if not faculty_profile or not subject_id or not batch_id:
        return False
    return TeachingAssignment.objects.filter(
        faculty=faculty_profile, subject_id=subject_id, batch_id=batch_id
    ).exists()


# ─── Marks ───────────────────────────────────────────────────────────────────
class MarkViewSet(viewsets.ModelViewSet):
    serializer_class = MarkSerializer

    def get_permissions(self):
        # Only admin or faculty can create/edit/delete marks
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdminOrFaculty()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Mark.objects.filter(student__university=user.university)
        if user.role == 'faculty':
            # Faculty sees marks ONLY for the exact (subject, batch) pairs they
            # are assigned to teach via TeachingAssignment -- not the whole department.
            q = faculty_teaching_q(user, subject_field='subject', student_field='student')
            if q is None:
                return Mark.objects.none()
            return Mark.objects.filter(student__university=user.university).filter(q)
        if user.role == 'student':
            return Mark.objects.filter(student__user=user)
        if user.role == 'parent':
            return Mark.objects.filter(student__parent__user=user)
        return Mark.objects.none()

    def create(self, request, *args, **kwargs):
        """
        Enforce subject and max_score from the exam:
        - subject is taken from exam.subject (admin sets it)
        - max_score is taken from exam.max_score (admin sets it)
        - score must not exceed max_score
        - if the requester is faculty, they must be assigned (via
          TeachingAssignment) to teach this subject to this student's batch
        """
        from rest_framework import status as http_status
        from core.models import Exam as ExamModel
        from people.models import StudentProfile

        data    = request.data
        exam_id = data.get('exam')
        try:
            exam = ExamModel.objects.get(pk=exam_id)
        except ExamModel.DoesNotExist:
            return Response({'exam': 'Invalid exam.'}, status=400)

        score     = float(data.get('score', 0))
        max_score = exam.max_score
        subject   = exam.subject   # may be None if admin didn't set one

        if score > max_score:
            return Response(
                {'score': f'Score {score} exceeds max score {max_score} for this exam.'},
                status=400,
            )

        if request.user.role == 'faculty':
            try:
                student = StudentProfile.objects.get(pk=data.get('student'))
            except StudentProfile.DoesNotExist:
                return Response({'student': 'Invalid student.'}, status=400)
            subject_id = subject.pk if subject else data.get('subject')
            if not faculty_can_teach(request.user, subject_id, student.batch_id):
                return Response(
                    {'detail': 'You are not assigned to teach this subject for this student\'s batch.'},
                    status=403,
                )

        # Build the payload: override subject and max_score from exam
        payload = {
            'student':    data.get('student'),
            'exam':       exam_id,
            'subject':    (subject.pk if subject else data.get('subject')),
            'score':      score,
            'max_score':  max_score,
        }

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save(added_by=request.user)
        return Response(serializer.data, status=http_status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        # Fallback (used by update/partial_update paths)
        serializer.save(added_by=self.request.user)


# ─── Attendance ───────────────────────────────────────────────────────────────
class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'bulk'):
            return [permissions.IsAuthenticated(), IsAdminOrFaculty()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Attendance.objects.filter(student__university=user.university)
        if user.role == 'faculty':
            # Faculty sees attendance ONLY for the exact (subject, batch) pairs
            # they are assigned to teach via TeachingAssignment -- not just
            # records they personally marked, and not the whole department.
            q = faculty_teaching_q(user, subject_field='subject', student_field='student')
            if q is None:
                return Attendance.objects.none()
            return Attendance.objects.filter(student__university=user.university).filter(q)
        if user.role == 'student':
            return Attendance.objects.filter(student__user=user)
        if user.role == 'parent':
            return Attendance.objects.filter(student__parent__user=user)
        return Attendance.objects.none()

    def create(self, request, *args, **kwargs):
        """Single upsert wrapped in atomic to avoid SQLite lock on rapid retries."""
        from rest_framework import status as http_status
        from people.models import StudentProfile
        data = request.data

        if request.user.role == 'faculty':
            try:
                student = StudentProfile.objects.get(pk=data.get('student'))
            except StudentProfile.DoesNotExist:
                return Response({'student': 'Invalid student.'}, status=400)
            if not faculty_can_teach(request.user, data.get('subject'), student.batch_id):
                return Response(
                    {'detail': 'You are not assigned to teach this subject for this student\'s batch.'},
                    status=403,
                )

        with transaction.atomic():
            obj, created = Attendance.objects.update_or_create(
                student_id=data.get('student'),
                subject_id=data.get('subject'),
                date=data.get('date'),
                defaults={
                    'is_present': data.get('is_present', True),
                    'marked_by':  request.user,
                },
            )
        serializer = self.get_serializer(obj)
        status_code = http_status.HTTP_201_CREATED if created else http_status.HTTP_200_OK
        return Response(serializer.data, status=status_code)

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk(self, request):
        """
        Bulk upsert: accepts a list of attendance records and processes them all
        inside a single atomic transaction — avoids the SQLite 'database is locked'
        error that happens when many concurrent POSTs hit the DB at once.

        Payload: [ { student, subject, date, is_present }, ... ]

        For faculty, every record's (subject, student's batch) pair is checked
        against TeachingAssignment before anything is written -- a faculty
        member can no longer bulk-mark attendance for a batch/subject they
        aren't actually assigned to.
        """
        from rest_framework import status as http_status
        from people.models import StudentProfile
        records = request.data
        if not isinstance(records, list):
            return Response({'error': 'Expected a list of attendance records.'}, status=400)

        if request.user.role == 'faculty':
            student_ids = {item.get('student') for item in records if item.get('student')}
            batch_by_student = dict(
                StudentProfile.objects.filter(pk__in=student_ids).values_list('pk', 'batch_id')
            )
            for item in records:
                batch_id = batch_by_student.get(item.get('student'))
                if not faculty_can_teach(request.user, item.get('subject'), batch_id):
                    return Response(
                        {'detail': f"You are not assigned to teach subject {item.get('subject')} "
                                   f"for student {item.get('student')}'s batch."},
                        status=403,
                    )

        results = []
        with transaction.atomic():
            for item in records:
                obj, created = Attendance.objects.update_or_create(
                    student_id=item.get('student'),
                    subject_id=item.get('subject'),
                    date=item.get('date'),
                    defaults={
                        'is_present': item.get('is_present', True),
                        'marked_by':  request.user,
                    },
                )
                results.append({'id': obj.id, 'created': created})

        return Response({'saved': len(results), 'records': results}, status=http_status.HTTP_200_OK)


# ─── Notices ─────────────────────────────────────────────────────────────────
class NoticeViewSet(viewsets.ModelViewSet):
    serializer_class = NoticeSerializer

    def get_permissions(self):
        # All roles can READ; only admin can write
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Notice.objects.filter(university=self.request.user.university)

    def perform_create(self, serializer):
        serializer.save(university=self.request.user.university, created_by=self.request.user)


# ─── Resources ───────────────────────────────────────────────────────────────
class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Resource.objects.filter(university=self.request.user.university)

    def perform_create(self, serializer):
        serializer.save(university=self.request.user.university, created_by=self.request.user)