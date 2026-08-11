from django.db import migrations


def backfill_department_codes(apps, schema_editor):
    Department = apps.get_model('core', 'Department')
    University = apps.get_model('core', 'University')

    for university in University.objects.all():
        depts = Department.objects.filter(university=university).order_by('id')
        used = {d.code for d in depts if d.code}
        n = 1
        for dept in depts:
            if dept.code:
                continue
            while f"{n:02d}" in used:
                n += 1
            dept.code = f"{n:02d}"
            used.add(dept.code)
            dept.save(update_fields=['code'])
            n += 1


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_enrollment_number_support'),
    ]

    operations = [
        migrations.RunPython(backfill_department_codes, noop_reverse),
    ]
