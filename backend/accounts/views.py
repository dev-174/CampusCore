import secrets
from datetime import timedelta
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.contrib.auth.models import update_last_login

from core.models import University
from people.models import StudentProfile, FacultyProfile
from .models import PasswordResetOTP
from .email_service import send_otp_email
from .serializers import (
    RegisterUniversitySerializer, UserProfileSerializer
)

User = get_user_model()


# calls the reg.uni.Ser
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
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if len(password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=400)

        try:
            user = User.objects.get(email__iexact=email, is_verified=False)
        except User.DoesNotExist:
            return Response({'error': 'Invalid request or account already activated.'}, status=400)

        if username:
            if User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
                return Response({'error': 'Username already taken. Please choose another.'}, status=400)
            user.username = username

        user.set_password(password)
        user.is_verified = True
        user.save()
        return Response({'message': 'Account activated! You can now login.'})


# ── Custom JWT login — adds role, name, university_code + profile fields to response ─────
class CustomTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Update last_login timestamp on successful login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        update_last_login(None, user)

        data['username']        = user.username
        data['email']           = user.email
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

# use custom serializer instead to JWT
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer


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


# ── Forgot Password via Email OTP ───────────────────────────────────────────

class PasswordResetRequestOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if email exists
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'This email is not registered.'}, status=status.HTTP_400_BAD_REQUEST)

        # If account is Pending/Not Verified → 400 "Your account is not verified yet. Please complete registration first."
        if not user.is_verified:
            return Response(
                {'error': 'Your account is not verified yet. Please complete registration first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # If account is inactive/disabled → 400 "Your account has been disabled. Please contact the administrator."
        if not user.is_active:
            return Response(
                {'error': 'Your account has been disabled. Please contact the administrator.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Rate-limiting: prevent spamming OTP requests (60 seconds cooldown)
        latest_otp = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()
        if latest_otp:
            time_since_sent = (timezone.now() - latest_otp.last_sent_at).total_seconds()
            if time_since_sent < 60:
                remaining_sec = int(60 - time_since_sent)
                return Response(
                    {'error': f'Please wait {remaining_sec} seconds before requesting another OTP.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        # Invalidate any existing active OTPs for this user
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        # Generate secure random 6-digit OTP
        otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
        hashed_otp = make_password(otp_code)
        expires_at = timezone.now() + timedelta(minutes=10)

        # Store ONLY the hashed OTP in the database
        PasswordResetOTP.objects.create(
            user=user,
            email=user.email,
            otp_hash=hashed_otp,
            expires_at=expires_at,
            attempts=0,
            is_used=False
        )

        # Dispatch email via Node Express Email Service
        send_otp_email(user.email, otp_code, expiry_minutes=10)

        return Response({
            'message': 'Password reset OTP has been sent to your registered email address.'
        })


class PasswordResetVerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({'error': 'Email address and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'This email is not registered.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()

        if not otp_record or timezone.now() > otp_record.expires_at:
            return Response(
                {'error': 'OTP has expired or is invalid. Please request a new OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_record.attempts >= 5:
            otp_record.is_used = True
            otp_record.save()
            return Response(
                {'error': 'Maximum wrong OTP attempts exceeded. Please request a new OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify hashed OTP
        if not check_password(otp, otp_record.otp_hash):
            otp_record.attempts += 1
            remaining = 5 - otp_record.attempts
            if remaining <= 0:
                otp_record.is_used = True
                otp_record.save()
                return Response(
                    {'error': 'Maximum wrong OTP attempts exceeded. Please request a new OTP.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            otp_record.save()
            return Response(
                {'error': f'Invalid OTP. {remaining} attempt(s) remaining.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({'message': 'OTP verified successfully.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not email or not otp or not new_password or not confirm_password:
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'This email is not registered.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()

        if (
            not otp_record
            or timezone.now() > otp_record.expires_at
            or otp_record.attempts >= 5
            or not check_password(otp, otp_record.otp_hash)
        ):
            return Response(
                {'error': 'Invalid or expired OTP session. Please request a new OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password using Django's set_password
        user.set_password(new_password)
        user.save()

        # Invalidate the OTP after successful use
        otp_record.is_used = True
        otp_record.save()

        return Response({'message': 'Password updated successfully. You can now log in with your new password.'})

