import random
import string
from django.db import models


def make_code():
    """Generate a unique university code like UNI-A3X9K2"""
    return 'UNI-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class University(models.Model):
    name       = models.CharField(max_length=200, unique=True)
    code       = models.CharField(max_length=12, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.code:
            code = make_code()
            while University.objects.filter(code=code).exists():
                code = make_code()
            self.code = code
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Department(models.Model):
    university = models.ForeignKey(University, related_name='departments', on_delete=models.CASCADE)
    name       = models.CharField(max_length=100)

    class Meta:
        unique_together = ('university', 'name')

    def __str__(self):
        return self.name


class Batch(models.Model):
    department = models.ForeignKey(Department, related_name='batches', on_delete=models.CASCADE)
    name       = models.CharField(max_length=50)   # e.g. "2024-2027"
    year       = models.IntegerField()

    class Meta:
        unique_together = ('department', 'name')

    def __str__(self):
        return f"{self.name} ({self.department.name})"


class Subject(models.Model):
    department = models.ForeignKey(Department, related_name='subjects', on_delete=models.CASCADE)
    name       = models.CharField(max_length=100)
    code       = models.CharField(max_length=20, blank=True)
    faculty = models.ForeignKey(
    'people.FacultyProfile', null=True, blank=True,
    on_delete=models.SET_NULL, related_name='subjects',
)

    class Meta:
        unique_together = ('department', 'name')

    def __str__(self):
        return f"{self.code} — {self.name}" if self.code else self.name


class TeachingAssignment(models.Model):
    """
    The real source of truth for 'who teaches whom'.
    Subject.faculty (above) is kept only as an optional default/coordinator
    label — it is NOT used for permission checks anymore. Access to a
    batch's marks/attendance for a given subject is granted ONLY via a
    matching TeachingAssignment row. This is what makes Batch functionally
    meaningful, and lets DM->A1 be taught by Faculty X while DM->A3 is
    taught by Faculty Y.
    """
    subject    = models.ForeignKey(Subject, related_name='teaching_assignments', on_delete=models.CASCADE)
    batch      = models.ForeignKey(Batch, related_name='teaching_assignments', on_delete=models.CASCADE)
    faculty    = models.ForeignKey('people.FacultyProfile', related_name='teaching_assignments', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('subject', 'batch')  # one faculty per subject per batch

    def __str__(self):
        return f"{self.faculty} teaches {self.subject} to {self.batch}"


class Exam(models.Model):
    TYPES = [
        ('internal', 'Internal'),
        ('midterm',  'Midterm'),
        ('final',    'Final'),
    ]
    university = models.ForeignKey(University, related_name='exams', on_delete=models.CASCADE)
    title      = models.CharField(max_length=200)
    exam_type  = models.CharField(max_length=10, choices=TYPES, default='internal')
    date       = models.DateField(null=True, blank=True)
    max_score  = models.FloatField(default=100)
    subject    = models.ForeignKey(
        'Subject', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='exams', help_text='Subject this exam covers'
    )
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_exam_type_display()})"