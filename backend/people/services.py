"""
Enrollment number generation.

Format: YY CC DD SSSSSS  (12 digits, e.g. 240103000123)
  YY      last 2 digits of StudentProfile.admission_year
  CC      University.campus_code (2 digits; single-campus default '01')
  DD      Department.code (2 digits, configured per department)
  SSSSSS  6-digit serial, monotonic per (university, department,
          admission_year), never derived from a student count.

Called from StudentProfile.save() the first time a profile is saved without
an enrollment_number. Never call this to regenerate an existing number --
enrollment numbers are permanent.
"""
from django.db.models import F

from core.models import EnrollmentSequence

MAX_SERIAL = 999_999


class EnrollmentNumberError(Exception):
    """Raised when an enrollment number cannot be generated (bad/missing
    config), so callers can turn it into a clean 400 response."""


def _validate_two_digit_code(value, label):
    value = (value or '').strip()
    if not (value.isdigit() and len(value) == 2):
        raise EnrollmentNumberError(
            f"{label} must be configured as a 2-digit numeric code (got {value!r})."
        )


def _next_serial(university, department, admission_year):
    """
    Atomically allocate the next serial for this (university, department,
    admission_year) bucket via a single `F('last_serial') + 1` UPDATE.
    """
    EnrollmentSequence.objects.get_or_create(
        university=university, department=department, admission_year=admission_year,
    )
    EnrollmentSequence.objects.filter(
        university=university, department=department, admission_year=admission_year,
    ).update(last_serial=F('last_serial') + 1)

    serial = EnrollmentSequence.objects.values_list('last_serial', flat=True).get(
        university=university, department=department, admission_year=admission_year,
    )
    if serial > MAX_SERIAL:
        raise EnrollmentNumberError(
            f"Enrollment serials exhausted (max {MAX_SERIAL}) for "
            f"{university} / {department} / {admission_year}."
        )
    return serial


def generate_enrollment_number(university, department, admission_year):
    if university is None:
        raise EnrollmentNumberError("A university is required to generate an enrollment number.")
    if department is None:
        raise EnrollmentNumberError("A department is required to generate an enrollment number.")
    if not admission_year:
        raise EnrollmentNumberError("An admission year is required to generate an enrollment number.")

    _validate_two_digit_code(department.code, f"Department '{department.name}' code")
    campus_code = getattr(university, 'campus_code', '') or ''
    _validate_two_digit_code(campus_code, f"University '{university}' campus_code")

    yy = f"{admission_year % 100:02d}"
    serial = _next_serial(university, department, admission_year)
    return f"{yy}{campus_code}{department.code}{serial:06d}"


def generate_roll_number(university, department):
    """
    Concurrency-safe automatic roll number generator.
    Format: PREFIX + 3-digit serial (e.g. CO001, IN002, ME003) where PREFIX
    is the first 2 uppercase letters of department.name (default 'ST').
    """
    from core.models import RollNumberSequence
    from .models import StudentProfile

    if university is None:
        raise ValueError("A university is required to generate a roll number.")

    prefix = department.name[:2].upper() if (department and department.name) else 'ST'

    seq, created = RollNumberSequence.objects.get_or_create(
        university=university,
        department=department,
        prefix=prefix,
    )

    if created:
        existing_rolls = StudentProfile.objects.filter(
            university=university,
            roll_no__istartswith=prefix,
        ).values_list('roll_no', flat=True)

        max_num = 0
        for r in existing_rolls:
            num_str = r[len(prefix):]
            if num_str.isdigit():
                max_num = max(max_num, int(num_str))

        if max_num > 0:
            RollNumberSequence.objects.filter(pk=seq.pk).update(last_serial=max_num)

    while True:
        RollNumberSequence.objects.filter(pk=seq.pk).update(last_serial=F('last_serial') + 1)
        seq.refresh_from_db(fields=['last_serial'])
        candidate = f"{prefix}{seq.last_serial:03d}"

        if not StudentProfile.objects.filter(university=university, roll_no=candidate).exists():
            return candidate


def create_student(email, name, university, department, batch, admission_year=None):
    """
    Single centralized service for creating a Student profile atomically with
    a system-generated roll number. Shared by single creation and bulk upload.
    """
    from django.db import transaction
    from django.contrib.auth import get_user_model
    from django.utils import timezone
    from .models import StudentProfile

    User = get_user_model()

    email_clean = (email or '').strip()
    if not email_clean:
        raise ValueError("Email is required.")
    if User.objects.filter(email__iexact=email_clean).exists():
        raise ValueError("Email already in use.")

    if not admission_year or str(admission_year).strip() == '':
        admission_year_val = timezone.now().year
    else:
        try:
            admission_year_val = int(admission_year)
        except (TypeError, ValueError):
            raise ValueError("Invalid admission_year format.")

    with transaction.atomic():
        roll_no = generate_roll_number(university, department)

        user = User(
            username=email_clean,
            email=email_clean,
            first_name=(name or '').strip(),
            role='student',
            university=university,
            is_verified=False,
        )
        user.set_unusable_password()
        user.save()

        profile = StudentProfile.objects.create(
            user=user,
            university=university,
            department=department,
            batch=batch,
            roll_no=roll_no,
            admission_year=admission_year_val,
        )
        return profile


def generate_employee_id(university=None, department=None, prefix="EMP"):
    """
    Automatic employee/faculty ID generator.
    Format: EMP-0001, EMP-0002, etc.
    """
    import re
    from .models import FacultyProfile, AdminProfile

    qs_fac = FacultyProfile.objects.filter(employee_id__istartswith=prefix).values_list('employee_id', flat=True)
    qs_adm = AdminProfile.objects.filter(employee_id__istartswith=prefix).values_list('employee_id', flat=True)
    existing = list(qs_fac) + list(qs_adm)

    max_num = 0
    pattern = re.compile(rf'^{prefix}-?(\d+)$', re.IGNORECASE)
    for eid in existing:
        if eid:
            m = pattern.match(str(eid).strip())
            if m:
                try:
                    max_num = max(max_num, int(m.group(1)))
                except ValueError:
                    pass

    next_num = max_num + 1
    candidate = f"{prefix}-{next_num:04d}"

    while (
        FacultyProfile.objects.filter(employee_id=candidate).exists() or
        AdminProfile.objects.filter(employee_id=candidate).exists()
    ):
        next_num += 1
        candidate = f"{prefix}-{next_num:04d}"

    return candidate


