from django.db import models
from django.contrib.auth import get_user_model
from core.models import University, Department, Batch

User = get_user_model()


class ParentProfile(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='parent_profile')
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='parents')

    def __str__(self):
        return self.user.get_full_name() or self.user.email


class StudentProfile(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='students')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    batch      = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True)
    roll_no    = models.CharField(max_length=20)
    parent     = models.ForeignKey(
        ParentProfile, related_name='children',
        null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        unique_together = ('university', 'roll_no')

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.roll_no})"


class FacultyProfile(models.Model):
    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name='faculty_profile')
    university  = models.ForeignKey(University, on_delete=models.CASCADE, related_name='faculty')
    department  = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    designation = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, blank=True, default='')

    def __str__(self):
        return self.user.get_full_name() or self.user.email


class AdminProfile(models.Model):
    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    university  = models.ForeignKey(University, on_delete=models.CASCADE, related_name='admins')
    department  = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    designation = models.CharField(max_length=100, blank=True, default='')
    employee_id = models.CharField(max_length=50, blank=True, default='')

    def __str__(self):
        return self.user.get_full_name() or self.user.email
