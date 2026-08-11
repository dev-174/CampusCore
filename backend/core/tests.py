from datetime import timedelta
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from core.models import University, Department, Subject

User = get_user_model()


class SubjectUniquenessTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.university = University.objects.create(name="Test Uni")
        self.department = Department.objects.create(name="Computer Eng", university=self.university, code="01")
        self.admin = User.objects.create_user(
            username="admin@test.com", email="admin@test.com", password="password123",
            role="admin", is_staff=True, university=self.university
        )
        self.client.force_authenticate(user=self.admin)

    def test_duplicate_subject_code_rejected(self):
        sub1 = Subject.objects.create(name="Data Structures", code="CS101", department=self.department)
        self.assertEqual(sub1.code, "CS101")

        response = self.client.post('/api/subjects/', {
            'name': 'Algorithms',
            'code': 'cs101',
            'department': self.department.id
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("already in use. Please enter a unique code.", str(response.data))
        self.assertEqual(Subject.objects.filter(code__iexact="CS101").count(), 1)


class ExamDateValidationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.university = University.objects.create(name="Test Uni 2")
        self.department = Department.objects.create(name="IT", university=self.university, code="02")
        self.subject = Subject.objects.create(name="Web Dev", code="IT101", department=self.department)
        self.admin = User.objects.create_user(
            username="admin2@test.com", email="admin2@test.com", password="password123",
            role="admin", is_staff=True, university=self.university
        )
        self.client.force_authenticate(user=self.admin)

    def test_past_exam_date_rejected(self):
        yesterday = (timezone.now().date() - timedelta(days=1)).isoformat()
        response = self.client.post('/api/exams/', {
            'title': 'Midterm Exam',
            'exam_type': 'midterm',
            'date': yesterday,
            'max_score': 100,
            'subject': self.subject.id,
            'department': self.department.id,
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("Exam date cannot be in the past.", str(response.data))

    def test_future_exam_date_accepted(self):
        tomorrow = (timezone.now().date() + timedelta(days=1)).isoformat()
        response = self.client.post('/api/exams/', {
            'title': 'Final Exam',
            'exam_type': 'final',
            'date': tomorrow,
            'max_score': 100,
            'subject': self.subject.id,
            'department': self.department.id,
        })
        self.assertEqual(response.status_code, 201)
