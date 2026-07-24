from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

from core.models import University
from people.models import StudentProfile, FacultyProfile
from .serializers import RegisterUniversitySerializer, RegisterAdminSerializer

User = get_user_model()


# ── Register a brand-new university (creates first admin) ─────────────────────
class RegisterUniversityView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = RegisterUniversitySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        result = s.save()
        return Response({
            'message': 'University created successfully.',
            'university_name': result['university'].name,
            'university_code': result['university'].code,
        }, status=201)


# ── Join an existing university as admin ──────────────────────────────────────
class RegisterAdminView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = RegisterAdminSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response({
            'message': 'Admin account created.',
            'university_code': user.university.code,
        }, status=201)


# ── Claim account Step 1: verify role + code + email ─────────────────────────
class ClaimVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        role  = request.data.get('role', '').lower()
        code  = request.data.get('university_code', '').strip().upper()
        email = request.data.get('email', '').strip().lower()

        if role not in ('student', 'faculty', 'parent'):
            return Response({'error': 'Invalid role. Choose student, faculty, or parent.'}, status=400)

        try:
            university = University.objects.get(code=code)
        except University.DoesNotExist:
            return Response({'error': 'Invalid university code.'}, status=400)

        try:
            user = User.objects.get(email__iexact=email, university=university, role=role)
        except User.DoesNotExist:
            return Response({'error': 'No account found. Ask your admin to add you first.'}, status=404)

        if user.is_verified:
            return Response({'error': 'Account already claimed. Go to login.'}, status=400)

        return Response({
            'message': 'Account found! Set your password.',
            'name': user.get_full_name() or user.first_name,
            'email': user.email,
        })


# ── Claim account Step 2: set password ───────────────────────────────────────
class ClaimSetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        if len(password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=400)

        try:
            user = User.objects.get(email__iexact=email, is_verified=False)
        except User.DoesNotExist:
            return Response({'error': 'Invalid request or account already activated.'}, status=400)

        user.set_password(password)
        user.is_verified = True
        user.save()
        return Response({'message': 'Account activated! You can now login.'})


# ── Custom JWT login — adds role, name, university_code + profile fields to response ─────
class CustomTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['role']            = user.role
        data['name']            = user.first_name or user.username
        data['university_id']   = user.university_id
        data['university_code'] = user.university.code if user.university else None
        data['is_verified']     = user.is_verified

        # Attach profile-specific fields so the frontend never shows N/A
        if user.role == 'student':
            try:
                profile = StudentProfile.objects.select_related('department', 'batch').get(user=user)
                data['department']        = profile.department.name if profile.department else None
                data['batch']             = profile.batch.name if profile.batch else None
                data['roll_no']           = profile.roll_no
                data['enrollment_number'] = profile.enrollment_number
            except StudentProfile.DoesNotExist:
                data['department']        = None
                data['batch']             = None
                data['roll_no']           = None
                data['enrollment_number'] = None
        elif user.role == 'faculty':
            try:
                profile = FacultyProfile.objects.select_related('department').get(user=user)
                data['department'] = profile.department.name if profile.department else None
            except FacultyProfile.DoesNotExist:
                data['department'] = None

        return data


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer


from rest_framework import permissions
from .serializers import UserProfileSerializer

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(current_password):
            return Response({'error': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully.'})
