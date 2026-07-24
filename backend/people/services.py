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
    This is safe under concurrent creation without needing SELECT ... FOR
    UPDATE (which SQLite doesn't support): the increment happens inside one
    UPDATE statement, which every backend (including SQLite's whole-database
    write lock) executes atomically, so two simultaneous callers can never
    be handed the same serial.
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
