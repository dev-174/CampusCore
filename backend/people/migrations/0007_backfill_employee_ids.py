import re
from django.db import migrations


def backfill_employee_ids(apps, schema_editor):
    FacultyProfile = apps.get_model('people', 'FacultyProfile')
    AdminProfile = apps.get_model('people', 'AdminProfile')

    prefix = "EMP"
    qs_fac = FacultyProfile.objects.exclude(employee_id='').values_list('employee_id', flat=True)
    qs_adm = AdminProfile.objects.exclude(employee_id='').values_list('employee_id', flat=True)
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

    for prof in FacultyProfile.objects.filter(employee_id='').order_by('id'):
        max_num += 1
        prof.employee_id = f"{prefix}-{max_num:04d}"
        prof.save(update_fields=['employee_id'])

    for prof in AdminProfile.objects.filter(employee_id='').order_by('id'):
        max_num += 1
        prof.employee_id = f"{prefix}-{max_num:04d}"
        prof.save(update_fields=['employee_id'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0006_alter_studentprofile_enrollment_number'),
    ]

    operations = [
        migrations.RunPython(backfill_employee_ids, noop_reverse),
    ]
