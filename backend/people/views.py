import pandas as pd
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from django.contrib.auth import get_user_model

from core.models import Department, Batch
from .models import StudentProfile, FacultyProfile, ParentProfile
from .services import EnrollmentNumberError
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
        except (Department.DoesNotExist, Batch.DoesNotExist):
            return Response({'error': 'Invalid department or batch.'}, status=400)
        if User.objects.filter(email__iexact=data['email']).exists():
            return Response({'error': 'Email already in use.'}, status=400)
        adm_year_val = data.get('admission_year')
        if adm_year_val is not None and str(adm_year_val).strip() != '':
            try:
                admission_year = int(adm_year_val)
            except (TypeError, ValueError):
                return Response({'error': 'Invalid admission_year format.'}, status=400)
        else:
            from django.utils import timezone
            admission_year = timezone.now().year

        # NOTE: the frontend must never send an enrollment_number -- it is
        # always generated server-side in StudentProfile.save().
        user = create_user(data['email'], data['name'], 'student', university)
        try:
            profile = StudentProfile.objects.create(
                user=user, university=university, department=dept, batch=batch,
                roll_no=data['roll_no'], admission_year=admission_year,
            )
        except EnrollmentNumberError as e:
            user.delete()
            return Response({'error': str(e)}, status=400)
        return Response(StudentSerializer(profile).data, status=201)

    def destroy(self, request, pk=None):
        profile = self.get_object()
        user = profile.user
        profile.delete()
        user.delete()
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
        try:
            df = pd.read_csv(file).drop_duplicates('email').dropna(
                subset=['name', 'email', 'department', 'batch', 'roll_no', 'admission_year']
            )
        except Exception as e:
            return Response({'error': f'Failed to parse CSV file: {str(e)}'}, status=400)

        created, errors = [], []
        for _, row in df.iterrows():
            email_val = str(row['email']).strip()
            name_val  = str(row['name']).strip()
            roll_val  = str(row['roll_no']).strip()
            dept_val  = str(row['department']).strip()
            batch_val = str(row['batch']).strip()

            try:
                if User.objects.filter(email__iexact=email_val).exists():
                    errors.append({'email': email_val, 'error': 'Email already exists.'})
                    continue

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
                if raw_adm is not None and str(raw_adm).strip() != '':
                    try:
                        admission_year_val = int(str(raw_adm).strip())
                    except (TypeError, ValueError):
                        errors.append({'email': email_val, 'error': f"Invalid admission_year '{raw_adm}'."})
                        continue
                else:
                    from django.utils import timezone
                    admission_year_val = timezone.now().year

                user = create_user(email_val, name_val, 'student', university)
                try:
                    StudentProfile.objects.create(
                        user=user, university=university, department=dept, batch=batch,
                        roll_no=roll_val, admission_year=admission_year_val,
                    )
                except EnrollmentNumberError as e:
                    user.delete()
                    errors.append({'email': email_val, 'error': str(e)})
                    continue
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
        user = profile.user
        profile.delete()
        user.delete()
        return Response(status=204)

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
        user = profile.user
        profile.delete()
        user.delete()
        return Response(status=204)

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