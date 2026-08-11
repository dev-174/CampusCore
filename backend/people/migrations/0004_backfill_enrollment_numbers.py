from django.db import migrations
from django.db.models import F

MAX_SERIAL = 999_999


def backfill(apps, schema_editor):
    StudentProfile = apps.get_model('people', 'StudentProfile')
    EnrollmentSequence = apps.get_model('core', 'EnrollmentSequence')

    for student in StudentProfile.objects.filter(enrollment_number__isnull=True).order_by('id'):
        if not student.admission_year:
            # Best-effort recovery for pre-existing rows: prefer the
            # student's batch year, else fall back to today's year.
            year = getattr(student.batch, 'year', None) if student.batch_id else None
            if not year:
                from django.utils import timezone
                year = timezone.now().year
            student.admission_year = year

        if not student.department_id or not student.department.code:
            # Can't safely assign an enrollment number without a department
            # code; leave it blank for `generate_missing_enrollment_numbers`
            # to retry once the department is configured with a code.
            student.save(update_fields=['admission_year'])
            continue

        dept = student.department
        university = student.university
        campus_code = getattr(university, 'campus_code', '') or '01'

        seq, _ = EnrollmentSequence.objects.get_or_create(
            university=university, department=dept, admission_year=student.admission_year,
        )
        EnrollmentSequence.objects.filter(pk=seq.pk).update(last_serial=F('last_serial') + 1)
        seq.refresh_from_db(fields=['last_serial'])
        if seq.last_serial > MAX_SERIAL:
            student.save(update_fields=['admission_year'])
            continue

        yy = f"{student.admission_year % 100:02d}"
        student.enrollment_number = f"{yy}{campus_code}{dept.code}{seq.last_serial:06d}"
        student.save(update_fields=['admission_year', 'enrollment_number'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0003_admission_year_enrollment_number'),
    ]

    operations = [
        migrations.RunPython(backfill, noop_reverse),
    ]
