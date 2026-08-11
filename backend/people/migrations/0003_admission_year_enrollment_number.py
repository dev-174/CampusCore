from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0002_facultyprofile_employee_id_adminprofile'),
        ('core', '0009_backfill_department_codes'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='admission_year',
            field=models.PositiveIntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='enrollment_number',
            field=models.CharField(
                max_length=12, unique=True, editable=False, null=True, blank=True, db_index=True,
            ),
        ),
    ]
