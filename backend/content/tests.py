from datetime import timedelta
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from core.models import University, Department, Batch, Subject
from people.models import StudentProfile
from content.serializers import AttendanceSerializer

User = get_user_model()


class AttendanceDateValidationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.university = University.objects.create(name="Test Uni 3")
        self.department = Department.objects.create(name="Mech Eng", university=self.university, code="03")
        self.batch = Batch.objects.create(department=self.department, name="A1", year=2025)
        self.subject = Subject.objects.create(name="Thermodynamics", code="ME101", department=self.department)

        self.student_user = User.objects.create_user(
            username="student@test.com", email="student@test.com", password="password123",
            role="student", university=self.university
        )
        self.student = StudentProfile.objects.create(
            user=self.student_user, university=self.university, department=self.department,
            batch=self.batch, roll_no="ME001", admission_year=2025
        )

    def test_future_attendance_date_rejected(self):
        tomorrow = timezone.now().date() + timedelta(days=1)
        serializer = AttendanceSerializer(data={
            'student': self.student.id,
            'subject': self.subject.id,
            'date': tomorrow.isoformat(),
            'is_present': True
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("Attendance date cannot be in the future.", str(serializer.errors))

    def test_past_attendance_date_accepted(self):
        yesterday = timezone.now().date() - timedelta(days=1)
        serializer = AttendanceSerializer(data={
            'student': self.student.id,
            'subject': self.subject.id,
            'date': yesterday.isoformat(),
            'is_present': True
        })
        self.assertTrue(serializer.is_valid())
