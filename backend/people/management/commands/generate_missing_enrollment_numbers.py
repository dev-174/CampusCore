"""
Safe, idempotent backfill for students left without an enrollment number
(e.g. legacy rows whose department had no code configured at migration
time). Re-running this command is always safe: students that already have
an enrollment_number are skipped untouched.

Usage:
    python manage.py generate_missing_enrollment_numbers
    python manage.py generate_missing_enrollment_numbers --dry-run
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from people.models import StudentProfile
from people.services import EnrollmentNumberError, generate_enrollment_number


class Command(BaseCommand):
    help = "Generate enrollment numbers for any students that don't have one yet."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                             help="Report what would happen without saving.")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        qs = StudentProfile.objects.filter(
            enrollment_number__isnull=True
        ).select_related('university', 'department').order_by('id')

        total, ok, failed = qs.count(), 0, 0
        if total == 0:
            self.stdout.write(self.style.SUCCESS("No students are missing an enrollment number."))
            return

        for student in qs:
            try:
                with transaction.atomic():
                    number = generate_enrollment_number(
                        university=student.university,
                        department=student.department,
                        admission_year=student.admission_year,
                    )
                    if not dry_run:
                        student.enrollment_number = number
                        student.save(update_fields=['enrollment_number'])
                ok += 1
                self.stdout.write(f"  student #{student.id}: {number}")
            except EnrollmentNumberError as e:
                failed += 1
                self.stderr.write(self.style.WARNING(f"  student #{student.id}: SKIPPED -- {e}"))

        verb = "Would generate" if dry_run else "Generated"
        self.stdout.write(self.style.SUCCESS(f"{verb} {ok}/{total} enrollment numbers ({failed} skipped)."))
