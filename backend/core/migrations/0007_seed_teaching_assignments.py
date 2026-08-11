from django.db import migrations


def seed_teaching_assignments(apps, schema_editor):
    """
    Preserve existing behaviour after the refactor: for every Subject that
    already has a Subject.faculty set, create a TeachingAssignment for that
    faculty covering EVERY batch in that subject's department (matches the
    old, overly-broad department-wide access exactly, so nobody loses access
    on deploy). Admin can then narrow it down / reassign per batch afterward
    in the new Teaching Assignments page.
    """
    Subject = apps.get_model('core', 'Subject')
    Batch = apps.get_model('core', 'Batch')
    TeachingAssignment = apps.get_model('core', 'TeachingAssignment')

    for subject in Subject.objects.exclude(faculty__isnull=True):
        batches = Batch.objects.filter(department=subject.department)
        for batch in batches:
            TeachingAssignment.objects.get_or_create(
                subject=subject,
                batch=batch,
                defaults={'faculty': subject.faculty},
            )


def reverse_noop(apps, schema_editor):
    # Intentionally no-op: reversing would delete manually-created
    # assignments too, which we don't want.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_teachingassignment'),
    ]

    operations = [
        migrations.RunPython(seed_teaching_assignments, reverse_noop),
    ]