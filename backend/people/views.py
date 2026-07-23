import pandas as pd
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from django.contrib.auth import get_user_model

from core.models import Department, Batch
from .models import StudentProfile, FacultyProfile, ParentProfile
from .serializers import (
    StudentSerializer, FacultySerializer, ParentSerializer,
    StudentPreviewSerializer, FacultyPreviewSerializer, ParentPreviewSerializer,
)

User = get_user_model()


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'faculty')


# ─── helpers ──────────────────────────────────────────────────────────────────

def create_user(email, name, role, university, verified=False):
    user = User(
        username=email, email=email,
        first_name=name, role=role,
        university=university, is_verified=verified,
    )
    user.set_unusable_password()
    user.save()
    return user


# ─── Students ─────────────────────────────────────────────────────────────────

class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer

    def get_permissions(self):
        # Only admin can create / update / delete students
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'bulk_upload'):
            return [permissions.IsAuthenticated(), IsAdmin()]
        # Faculty can list/retrieve students in their department
        return [permissions.IsAuthenticated(), IsAdminOrFaculty()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'faculty':
            try:
                dept = user.faculty_profile.department
            except Exception:
                return StudentProfile.objects.none()
            qs = StudentProfile.objects.filter(university=user.university, department=dept)
        else:
            qs = StudentProfile.objects.filter(university=user.university)

        # Optional ?batch=<id> filter -- used by pages (e.g. Mark Attendance,
        # Add Marks) that need students for one specific batch only, instead
        # of the whole department. This narrows the queryset above; it never
        # widens it, so a faculty member still can't see students outside
        # their own department this way.
        batch_id = self.request.query_params.get('batch')
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        return qs

    def create(self, request):
        data       = request.data
        university = request.user.university
        try:
            dept  = Department.objects.get(id=data['department'], university=university)
            batch = Batch.objects.get(id=data['batch'], department=dept)
        except (Department.DoesNotExist, Batch.DoesNotExist):
            return Response({'error': 'Invalid department or batch.'}, status=400)
        if User.objects.filter(email__iexact=data['email']).exists():
            return Response({'error': 'Email already in use.'}, status=400)

        user    = create_user(data['email'], data['name'], 'student', university)
        profile = StudentProfile.objects.create(
            user=user, university=university,
            department=dept, batch=batch, roll_no=data['roll_no'],
        )
        return Response(StudentSerializer(profile).data, status=201)

    def destroy(self, request, pk=None):
        profile = self.get_object()
        profile.user.is_active = False
        profile.user.save()
        return Response(status=204)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        profile = self.get_object()
        return Response(StudentPreviewSerializer(profile).data)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser], url_path='bulk-upload')
    def bulk_upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded.'}, status=400)
        university = request.user.university
        df = pd.read_csv(file).drop_duplicates('email').dropna(subset=['name','email','department','batch','roll_no'])
        created, errors = [], []
        for _, row in df.iterrows():
            try:
                if User.objects.filter(email__iexact=row['email']).exists():
                    errors.append({'email': row['email'], 'error': 'Email exists.'}); continue
                dept  = Department.objects.get(name=row['department'], university=university)
                batch = Batch.objects.get(name=row['batch'], department=dept)
                user  = create_user(row['email'], row['name'], 'student', university)
                StudentProfile.objects.create(user=user, university=university, department=dept, batch=batch, roll_no=row['roll_no'])
                created.append(row['email'])
            except Exception as e:
                errors.append({'email': row.get('email'), 'error': str(e)})
        return Response({'created': created, 'errors': errors}, status=201)


# ─── Faculty ──────────────────────────────────────────────────────────────────

class FacultyViewSet(viewsets.ModelViewSet):
    serializer_class   = FacultySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return FacultyProfile.objects.filter(university=self.request.user.university)

    def create(self, request):
        data       = request.data
        university = request.user.university
        try:
            dept = Department.objects.get(id=data['department'], university=university)
        except Department.DoesNotExist:
            return Response({'error': 'Invalid department.'}, status=400)
        if User.objects.filter(email__iexact=data['email']).exists():
            return Response({'error': 'Email already in use.'}, status=400)

        user    = create_user(data['email'], data['name'], 'faculty', university)
        profile = FacultyProfile.objects.create(
            user=user, university=university,
            department=dept, designation=data.get('designation', ''),
        )
        return Response(FacultySerializer(profile).data, status=201)

    def destroy(self, request, pk=None):
        profile = self.get_object()
        profile.user.is_active = False
        profile.user.save()
        return Response(status=204)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        profile = self.get_object()
        return Response(FacultyPreviewSerializer(profile).data)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser], url_path='bulk-upload')
    def bulk_upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file.'}, status=400)
        university = request.user.university
        df = pd.read_csv(file).drop_duplicates('email').dropna(subset=['name','email','department'])
        created, errors = [], []
        for _, row in df.iterrows():
            try:
                if User.objects.filter(email__iexact=row['email']).exists():
                    errors.append({'email': row['email'], 'error': 'Email exists.'}); continue
                dept = Department.objects.get(name=row['department'], university=university)
                user = create_user(row['email'], row['name'], 'faculty', university)
                FacultyProfile.objects.create(user=user, university=university, department=dept, designation=row.get('designation',''))
                created.append(row['email'])
            except Exception as e:
                errors.append({'email': row.get('email'), 'error': str(e)})
        return Response({'created': created, 'errors': errors}, status=201)


# ─── Parents ──────────────────────────────────────────────────────────────────

class ParentViewSet(viewsets.ModelViewSet):
    serializer_class   = ParentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return ParentProfile.objects.filter(university=self.request.user.university)

    def create(self, request):
        data       = request.data
        university = request.user.university
        if User.objects.filter(email__iexact=data['email']).exists():
            return Response({'error': 'Email already in use.'}, status=400)

        user    = create_user(data['email'], data['name'], 'parent', university)
        profile = ParentProfile.objects.create(user=user, university=university)

        roll_no = data.get('student_roll_no', '')
        if roll_no:
            try:
                student = StudentProfile.objects.get(university=university, roll_no=roll_no)
                student.parent = profile
                student.save()
            except StudentProfile.DoesNotExist:
                pass  # Parent created but not linked; admin can link later

        return Response(ParentSerializer(profile).data, status=201)

    def destroy(self, request, pk=None):
        profile = self.get_object()
        profile.user.is_active = False
        profile.user.save()
        return Response(status=204)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        profile = self.get_object()
        return Response(ParentPreviewSerializer(profile).data)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser], url_path='bulk-upload')
    def bulk_upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file.'}, status=400)
        university = request.user.university
        df = pd.read_csv(file).drop_duplicates('email').dropna(subset=['name','email'])
        created, errors = [], []
        for _, row in df.iterrows():
            try:
                if User.objects.filter(email__iexact=row['email']).exists():
                    errors.append({'email': row['email'], 'error': 'Email exists.'}); continue
                user    = create_user(row['email'], row['name'], 'parent', university)
                profile = ParentProfile.objects.create(user=user, university=university)
                roll_no = row.get('student_roll_no')
                if pd.notna(roll_no):
                    try:
                        s = StudentProfile.objects.get(university=university, roll_no=roll_no)
                        s.parent = profile; s.save()
                    except StudentProfile.DoesNotExist:
                        pass
                created.append(row['email'])
            except Exception as e:
                errors.append({'email': row.get('email'), 'error': str(e)})
        return Response({'created': created, 'errors': errors}, status=201)