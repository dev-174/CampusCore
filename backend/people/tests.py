from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from core.models import University, Department
from people.models import FacultyProfile, StudentProfile
from people.serializers import FacultySerializer

User = get_user_model()


class FacultyEmployeeIDTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.university = University.objects.create(name="Test Uni")
        self.department = Department.objects.create(name="Computer Eng", university=self.university, code="01")
        self.admin = User.objects.create_user(
            username="admin@test.com", email="admin@test.com", password="password123",
            role="admin", is_staff=True, university=self.university
        )
        self.client.force_authenticate(user=self.admin)

    def test_faculty_employee_id_auto_generated(self):
        # Create faculty member via API
        response = self.client.post('/api/faculty/', {
            'name': 'Dr. Alan Turing',
            'email': 'turing@test.com',
            'department': self.department.id,
            'designation': 'Professor'
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn('employee_id', response.data)
        self.assertTrue(response.data['employee_id'].startswith('EMP-'))

        profile = FacultyProfile.objects.get(user__email='turing@test.com')
        self.assertTrue(profile.employee_id.startswith('EMP-'))

    def test_faculty_serializer_includes_employee_id(self):
        user = User.objects.create_user(
            username="faculty@test.com", email="faculty@test.com", password="password123",
            role="faculty", university=self.university
        )
        profile = FacultyProfile.objects.create(
            user=user, university=self.university, department=self.department, designation="Lecturer"
        )
        serializer = FacultySerializer(profile)
        self.assertIn('employee_id', serializer.data)
        self.assertEqual(serializer.data['employee_id'], profile.employee_id)

