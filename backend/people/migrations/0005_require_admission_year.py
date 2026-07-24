from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0004_backfill_enrollment_numbers'),
    ]

    operations = [
        migrations.AlterField(
            model_name='studentprofile',
            name='admission_year',
            field=models.PositiveIntegerField(
                help_text="Year of admission, e.g. 2024. Used once to generate the "
                          "enrollment number; changing it afterwards does NOT "
                          "regenerate the enrollment number.",
            ),
        ),
    ]
