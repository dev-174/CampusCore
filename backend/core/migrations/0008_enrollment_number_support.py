import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_seed_teaching_assignments'),
    ]

    operations = [
        migrations.AddField(
            model_name='university',
            name='campus_code',
            field=models.CharField(
                default='01', max_length=2, blank=True,
                help_text="2-digit numeric campus/college code used as the "
                          "'CC' segment of student enrollment numbers.",
            ),
        ),
        migrations.AddField(
            model_name='department',
            name='code',
            field=models.CharField(
                default='', max_length=2, blank=True,
                help_text="2-digit numeric department code used as the 'DD' "
                          "segment of student enrollment numbers (e.g. '03').",
            ),
        ),
        migrations.CreateModel(
            name='EnrollmentSequence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('admission_year', models.PositiveIntegerField()),
                ('last_serial', models.PositiveIntegerField(default=0)),
                ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='enrollment_sequences', to='core.department')),
                ('university', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='enrollment_sequences', to='core.university')),
            ],
            options={
                'unique_together': {('university', 'department', 'admission_year')},
            },
        ),
    ]
