from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from accounts.models import PasswordResetOTP

User = get_user_model()


class ForgotPasswordOTPTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Verified & Active user
        self.active_user = User.objects.create_user(
            username='active_user',
            email='active@test.com',
            password='OldPassword123!',
            is_verified=True,
            is_active=True
        )

        # 2. Unverified user
        self.unverified_user = User.objects.create_user(
            username='unverified_user',
            email='unverified@test.com',
            password='Password123!',
            is_verified=False,
            is_active=True
        )

        # 3. Disabled / Inactive user
        self.disabled_user = User.objects.create_user(
            username='disabled_user',
            email='disabled@test.com',
            password='Password123!',
            is_verified=True,
            is_active=False
        )

    def test_request_otp_nonexistent_email(self):
        """Request OTP for an unregistered email returns 400."""
        response = self.client.post('/api/auth/forgot-password/request-otp/', {
            'email': 'nonexistent@test.com'
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'This email is not registered.')

    def test_request_otp_unverified_account(self):
        """Request OTP for an unverified account returns 400."""
        response = self.client.post('/api/auth/forgot-password/request-otp/', {
            'email': 'unverified@test.com'
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'Your account is not verified yet. Please complete registration first.')

    def test_request_otp_disabled_account(self):
        """Request OTP for a disabled account returns 400."""
        response = self.client.post('/api/auth/forgot-password/request-otp/', {
            'email': 'disabled@test.com'
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'Your account has been disabled. Please contact the administrator.')

    def test_request_otp_success_and_hashing(self):
        """Request OTP for a verified & active user creates a hashed OTP."""
        response = self.client.post('/api/auth/forgot-password/request-otp/', {
            'email': 'active@test.com'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('message', response.data)

        # Verify DB record
        otp_record = PasswordResetOTP.objects.filter(user=self.active_user).first()
        self.assertIsNotNone(otp_record)
        self.assertFalse(otp_record.is_used)
        self.assertNotEqual(otp_record.otp_hash, '123456') # Ensures hash, not plaintext
        self.assertTrue(otp_record.otp_hash.startswith('pbkdf2_') or len(otp_record.otp_hash) > 20)

    def test_request_otp_rate_limiting(self):
        """Requesting OTP twice within 60 seconds returns 429."""
        self.client.post('/api/auth/forgot-password/request-otp/', {'email': 'active@test.com'})
        response = self.client.post('/api/auth/forgot-password/request-otp/', {'email': 'active@test.com'})
        self.assertEqual(response.status_code, 429)
        self.assertIn('Please wait', response.data['error'])

    def test_verify_otp_max_attempts(self):
        """Entering incorrect OTP 5 times invalidates the OTP session."""
        raw_otp = '654321'
        PasswordResetOTP.objects.create(
            user=self.active_user,
            email=self.active_user.email,
            otp_hash=make_password(raw_otp),
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        for i in range(4):
            res = self.client.post('/api/auth/forgot-password/verify-otp/', {
                'email': 'active@test.com',
                'otp': '000000'
            })
            self.assertEqual(res.status_code, 400)
            self.assertIn('attempt(s) remaining', res.data['error'])

        # 5th failed attempt
        res = self.client.post('/api/auth/forgot-password/verify-otp/', {
            'email': 'active@test.com',
            'otp': '000000'
        })
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['error'], 'Maximum wrong OTP attempts exceeded. Please request a new OTP.')

        # Verify OTP is marked as used
        otp_record = PasswordResetOTP.objects.filter(user=self.active_user).first()
        self.assertTrue(otp_record.is_used)

    def test_full_forgot_password_flow(self):
        """Complete successful password reset flow."""
        raw_otp = '123456'
        otp_record = PasswordResetOTP.objects.create(
            user=self.active_user,
            email=self.active_user.email,
            otp_hash=make_password(raw_otp),
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        # 1. Verify OTP
        verify_res = self.client.post('/api/auth/forgot-password/verify-otp/', {
            'email': 'active@test.com',
            'otp': raw_otp
        })
        self.assertEqual(verify_res.status_code, 200)

        # 2. Reset password
        new_pass = 'BrandNewSecret123!'
        reset_res = self.client.post('/api/auth/forgot-password/reset-password/', {
            'email': 'active@test.com',
            'otp': raw_otp,
            'new_password': new_pass,
            'confirm_password': new_pass
        })
        self.assertEqual(reset_res.status_code, 200)

        # 3. Verify user's password updated
        self.active_user.refresh_from_db()
        self.assertTrue(self.active_user.check_password(new_pass))

        # 4. Verify OTP is now invalidated
        otp_record.refresh_from_db()
        self.assertTrue(otp_record.is_used)

        # 5. Verify reused OTP fails
        reuse_res = self.client.post('/api/auth/forgot-password/reset-password/', {
            'email': 'active@test.com',
            'otp': raw_otp,
            'new_password': 'AnotherPassword123!',
            'confirm_password': 'AnotherPassword123!'
        })
        self.assertEqual(reuse_res.status_code, 400)
