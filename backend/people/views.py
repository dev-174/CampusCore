import pandas as pd
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from django.contrib.auth import get_user_model

from core.models import Department, Batch, Subject
from .models import StudentProfile, FacultyProfile, ParentProfile
from .services import EnrollmentNumberError, create_student

from .serializers import (
    StudentSerializer, FacultySerializer, ParentSerializer,
    StudentPreviewSerializer, FacultyPreviewSerializer, ParentPreviewSerializer,
)

User = get_user_model()


from core.permissions import IsAdmin, IsAdminOrFaculty


# ─── helpers ──────────────────────────────────────────────────────────────────

def create_user(email, name, role, university, verified=False, username=None):
    if not username:
        username = email
    user = User(
        username=username, email=email,
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
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            try:
                return StudentProfile.objects.filter(user=user)
            except Exception:
                return StudentProfile.objects.none()
        elif user.role == 'parent':
            try:
                return user.parent_profile.children.filter(user__is_active=True)
            except Exception:
                return StudentProfile.objects.none()
        elif user.role == 'faculty':
            try:
                dept = user.faculty_profile.department
            except Exception:
                return StudentProfile.objects.none()
            qs = StudentProfile.objects.filter(university=user.university, department=dept, user__is_active=True)
        else:
            qs = StudentProfile.objects.filter(university=user.university, user__is_active=True)

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
        except (Department.DoesNotExist, Batch.DoesNotExist, KeyError):
            return Response({'error': 'Invalid department or batch.'}, status=400)

        email = data.get('email')
        name  = data.get('name')
        if not email or not name:
            return Response({'error': 'Name and email are required.'}, status=400)

        try:
            profile = create_student(
                email=email,
                name=name,
                university=university,
                department=dept,
                batch=batch,
                admission_year=data.get('admission_year'),
            )
        except (ValueError, EnrollmentNumberError) as e:
            return Response({'error': str(e)}, status=400)

        return Response(StudentSerializer(profile).data, status=201)


    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data.copy()

        user = instance.user
        if 'name' in data and data['name']:
            name_val = str(data['name']).strip()
            parts = name_val.split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save()

        if 'phone_number' in data:
            user.phone_number = str(data['phone_number']).strip()
            user.save()

        if 'department' in data and data['department']:
            try:
                dept = Department.objects.get(id=int(data['department']), university=request.user.university)
                instance.department = dept
            except (Department.DoesNotExist, ValueError):
                return Response({'error': 'Invalid department.'}, status=400)

        if 'batch' in data and data['batch']:
            try:
                batch = Batch.objects.get(id=int(data['batch']), department=instance.department)
                instance.batch = batch
            except (Batch.DoesNotExist, ValueError):
                return Response({'error': 'Selected batch does not belong to the selected department.'}, status=400)

        instance.save()
        instance.refresh_from_db()
        return Response(StudentPreviewSerializer(instance).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, pk=None):
        profile = self.get_object()
        user = profile.user
        profile.delete()
        if user:
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

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
        try:
            df = pd.read_csv(file).drop_duplicates('email').dropna(
                subset=['name', 'email', 'department', 'batch']
            )
        except Exception as e:
            return Response({'error': f'Failed to parse CSV file: {str(e)}'}, status=400)

        created, errors = [], []
        for _, row in df.iterrows():
            email_val = str(row['email']).strip()
            name_val  = str(row['name']).strip()
            dept_val  = str(row['department']).strip()
            batch_val = str(row['batch']).strip()

            try:
                # Department lookup by ID or name
                dept = None
                if dept_val.isdigit():
                    dept = Department.objects.filter(id=int(dept_val), university=university).first()
                if not dept:
                    dept = Department.objects.filter(name__iexact=dept_val, university=university).first()
                if not dept:
                    errors.append({'email': email_val, 'error': f"Department '{dept_val}' not found."})
                    continue

                # Batch lookup by ID or name
                batch = None
                if batch_val.isdigit():
                    batch = Batch.objects.filter(id=int(batch_val), department=dept).first()
                if not batch:
                    batch = Batch.objects.filter(name__iexact=batch_val, department=dept).first()
                if not batch:
                    errors.append({'email': email_val, 'error': f"Batch '{batch_val}' not found for department '{dept.name}'."})
                    continue

                raw_adm = row.get('admission_year') if ('admission_year' in row and pd.notna(row.get('admission_year'))) else None

                profile = create_student(
                    email=email_val,
                    name=name_val,
                    university=university,
                    department=dept,
                    batch=batch,
                    admission_year=raw_adm,
                )
                created.append(email_val)
            except Exception as e:
                errors.append({'email': email_val, 'error': str(e)})

        if not created:
            errMsg = errors[0]['error'] if errors else 'No valid student records found in file.'
            return Response({
                'error': f'Bulk upload failed: {errMsg}',
                'created': created,
                'errors': errors
            }, status=400)

        msg = f"Bulk upload completed: {len(created)} student(s) created successfully."
        if errors:
            msg += f" ({len(errors)} failed)."

        return Response({
            'message': msg,
            'created': created,
            'errors': errors
        }, status=201)


# ─── Faculty ──────────────────────────────────────────────────────────────────

class FacultyViewSet(viewsets.ModelViewSet):
    serializer_class   = FacultySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return FacultyProfile.objects.filter(university=self.request.user.university, user__is_active=True)

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
        deps = []

        ta_count = profile.teaching_assignments.count()
        if ta_count > 0:
            deps.append(f"{ta_count} teaching assignment(s)")

        subjects_count = Subject.objects.filter(faculty=profile).count()
        if subjects_count > 0:
            deps.append(f"{subjects_count} assigned subject(s)")

        if deps:
            name_str = profile.user.get_full_name() or profile.user.email
            msg = f"Cannot delete faculty member '{name_str}' because they are assigned to {', '.join(deps)}."
            return Response({'error': msg, 'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        user = profile.user
        profile.delete()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        profile = self.get_object()
        return Response(FacultyPreviewSerializer(profile).data)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser], url_path='bulk-upload')
    def bulk_upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded.'}, status=400)
        university = request.user.university
        try:
            df = pd.read_csv(file).drop_duplicates('email').dropna(subset=['name','email','department'])
        except Exception as e:
            return Response({'error': f'Failed to parse CSV file: {str(e)}'}, status=400)

        created, errors = [], []
        for _, row in df.iterrows():
            email_val = str(row['email']).strip()
            name_val  = str(row['name']).strip()
            dept_val  = str(row['department']).strip()
            desig_val = str(row.get('designation', '')).strip() if pd.notna(row.get('designation')) else ''

            try:
                if User.objects.filter(email__iexact=email_val).exists():
                    errors.append({'email': email_val, 'error': 'Email already exists.'})
                    continue

                dept = None
                if dept_val.isdigit():
                    dept = Department.objects.filter(id=int(dept_val), university=university).first()
                if not dept:
                    dept = Department.objects.filter(name__iexact=dept_val, university=university).first()
                if not dept:
                    errors.append({'email': email_val, 'error': f"Department '{dept_val}' not found."})
                    continue

                user = create_user(email_val, name_val, 'faculty', university)
                FacultyProfile.objects.create(
                    user=user, university=university, department=dept, designation=desig_val
                )
                created.append(email_val)
            except Exception as e:
                errors.append({'email': email_val, 'error': str(e)})

        if not created:
            errMsg = errors[0]['error'] if errors else 'No valid faculty records found in file.'
            return Response({
                'error': f'Bulk upload failed: {errMsg}',
                'created': created,
                'errors': errors
            }, status=400)

        msg = f"Bulk upload completed: {len(created)} faculty member(s) created successfully."
        if errors:
            msg += f" ({len(errors)} failed)."

        return Response({
            'message': msg,
            'created': created,
            'errors': errors
        }, status=201)


# ─── Parents ──────────────────────────────────────────────────────────────────

class ParentViewSet(viewsets.ModelViewSet):
    serializer_class   = ParentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return ParentProfile.objects.filter(university=self.request.user.university, user__is_active=True)

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
                pass

        return Response(ParentSerializer(profile).data, status=201)

    def destroy(self, request, pk=None):
        profile = self.get_object()
        children_count = profile.children.count()

        if children_count > 0:
            name_str = profile.user.get_full_name() or profile.user.email
            msg = f"Cannot delete parent '{name_str}' because their account is linked to {children_count} student profile(s)."
            return Response({'error': msg, 'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        user = profile.user
        profile.delete()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        profile = self.get_object()
        return Response(ParentPreviewSerializer(profile).data)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser], url_path='bulk-upload')
    def bulk_upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded.'}, status=400)
        university = request.user.university
        try:
            df = pd.read_csv(file).drop_duplicates('email').dropna(subset=['name','email'])
        except Exception as e:
            return Response({'error': f'Failed to parse CSV file: {str(e)}'}, status=400)

        created, errors = [], []
        for _, row in df.iterrows():
            email_val = str(row['email']).strip()
            name_val  = str(row['name']).strip()
            roll_val  = str(row.get('student_roll_no', '')).strip() if pd.notna(row.get('student_roll_no')) else ''

            try:
                if User.objects.filter(email__iexact=email_val).exists():
                    errors.append({'email': email_val, 'error': 'Email already exists.'})
                    continue

                user    = create_user(email_val, name_val, 'parent', university)
                profile = ParentProfile.objects.create(user=user, university=university)
                if roll_val:
                    try:
                        s = StudentProfile.objects.get(university=university, roll_no=roll_val)
                        s.parent = profile
                        s.save()
                    except StudentProfile.DoesNotExist:
                        pass
                created.append(email_val)
            except Exception as e:
                errors.append({'email': email_val, 'error': str(e)})

        if not created:
            errMsg = errors[0]['error'] if errors else 'No valid parent records found in file.'
            return Response({
                'error': f'Bulk upload failed: {errMsg}',
                'created': created,
                'errors': errors
            }, status=400)

        msg = f"Bulk upload completed: {len(created)} parent(s) created successfully."
        if errors:
            msg += f" ({len(errors)} failed)."

        return Response({
            'message': msg,
            'created': created,
            'errors': errors
        }, status=201)