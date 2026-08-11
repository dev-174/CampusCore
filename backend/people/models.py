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

    admission_year = models.PositiveIntegerField(
        help_text="Year of admission, e.g. 2024. Used once to generate the "
                   "enrollment number; changing it afterwards does NOT "
                   "regenerate the enrollment number.",
    )

    # Permanent 12-digit identifier: YY(admission year) CC(campus) DD(dept)
    # SSSSSS(serial). Auto-generated exactly once in save(); never editable,
    # never re-derived from semester/division/batch/roll_no changes.
    enrollment_number = models.CharField(
        max_length=12, unique=True, editable=False, null=True, blank=True,
        db_index=True,
        help_text="Auto-generated, permanent 12-digit enrollment number.",
    )

    parent     = models.ForeignKey(
        ParentProfile, related_name='children',
        null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        unique_together = ('university', 'roll_no')

    def save(self, *args, **kwargs):
        if not self.enrollment_number:
            from django.db import transaction
            from .services import generate_enrollment_number

            with transaction.atomic():
                self.enrollment_number = generate_enrollment_number(
                    university=self.university,
                    department=self.department,
                    admission_year=self.admission_year,
                )
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.enrollment_number or self.roll_no})"


class FacultyProfile(models.Model):
    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name='faculty_profile')
    university  = models.ForeignKey(University, on_delete=models.CASCADE, related_name='faculty')
    department  = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    designation = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, blank=True, default='')

    def save(self, *args, **kwargs):
        if not self.employee_id:
            from .services import generate_employee_id
            self.employee_id = generate_employee_id( 
                university=self.university,
                department=self.department,
                prefix="EMP",
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return self.user.get_full_name() or self.user.email


class AdminProfile(models.Model):
    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    university  = models.ForeignKey(University, on_delete=models.CASCADE, related_name='admins')
    department  = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    designation = models.CharField(max_length=100, blank=True, default='')
    employee_id = models.CharField(max_length=50, blank=True, default='')

    def save(self, *args, **kwargs):
        if not self.employee_id:
            from .services import generate_employee_id
            self.employee_id = generate_employee_id(
                university=self.university,
                department=self.department,
                prefix="EMP",
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return self.user.get_full_name() or self.user.email

