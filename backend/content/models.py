from django.db import models
from django.contrib.auth import get_user_model
from core.models import University, Department, Subject, Exam
from people.models import StudentProfile

User = get_user_model()


class Mark(models.Model):
    student    = models.ForeignKey(StudentProfile, related_name='marks', on_delete=models.CASCADE)
    subject    = models.ForeignKey(Subject, on_delete=models.CASCADE)
    exam       = models.ForeignKey(Exam, on_delete=models.CASCADE)
    score      = models.FloatField()
    max_score  = models.FloatField(default=100)
    added_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'subject', 'exam')

    def percentage(self):
        return round((self.score / self.max_score) * 100, 2)

    def __str__(self):
        return f"{self.student} — {self.subject} — {self.score}/{self.max_score}"


class Attendance(models.Model):
    student    = models.ForeignKey(StudentProfile, related_name='attendance', on_delete=models.CASCADE)
    subject    = models.ForeignKey(Subject, on_delete=models.CASCADE)
    date       = models.DateField()
    is_present = models.BooleanField(default=True)
    marked_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        unique_together = ('student', 'subject', 'date')

    def __str__(self):
        status = 'P' if self.is_present else 'A'
        return f"{self.student} — {self.subject} — {self.date} ({status})"


class Notice(models.Model):
    university = models.ForeignKey(University, related_name='notices', on_delete=models.CASCADE)
    title      = models.CharField(max_length=200)
    content    = models.TextField()
    is_pinned  = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title


class Resource(models.Model):
    university  = models.ForeignKey(University, related_name='resources', on_delete=models.CASCADE)
    title       = models.CharField(max_length=200)
    url         = models.URLField()
    description = models.TextField(blank=True)
    department  = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL)
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
