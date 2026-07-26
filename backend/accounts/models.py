from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    ROLES = [
        ('admin',   'Admin'),
        ('student', 'Student'),
        ('faculty', 'Faculty'),
        ('parent',  'Parent'),
    ]
    role        = models.CharField(max_length=10, choices=ROLES, default='student')
    university  = models.ForeignKey(
        'core.University', null=True, blank=True, on_delete=models.SET_NULL
    )
    # is_verified = False means admin pre-created this account; user hasn't claimed it yet
    is_verified = models.BooleanField(default=False)

    # Personal profile fields
    phone_number  = models.CharField(max_length=20, blank=True, default='')
    profile_photo = models.CharField(max_length=500, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    gender        = models.CharField(max_length=20, blank=True, default='')
    blood_group   = models.CharField(max_length=10, blank=True, default='')
    address       = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.username} ({self.role})"


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_resets')
    email = models.EmailField(db_index=True)
    otp_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    is_used = models.BooleanField(default=False)
    last_sent_at = models.DateTimeField(auto_now=True)

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at and self.attempts < 5

    def __str__(self):
        return f"OTP for {self.email} (used={self.is_used})"

