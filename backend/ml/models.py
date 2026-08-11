from django.db import models
from people.models import StudentProfile


class RiskAlert(models.Model):
    """
    One row per risk notification. Created automatically when compute_risk()
    flags a student as newly high-risk -- NOT a broadcast Notice, since risk
    status is sensitive and must only reach that student's own parent and
    the faculty who actually teach them.
    """
    student            = models.ForeignKey(StudentProfile, related_name='risk_alerts', on_delete=models.CASCADE)
    risk_percent       = models.FloatField()
    message            = models.TextField()
    created_at         = models.DateTimeField(auto_now_add=True)
    is_read_by_parent  = models.BooleanField(default=False)
    is_read_by_faculty = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Risk alert for {self.student} ({self.risk_percent}%)"