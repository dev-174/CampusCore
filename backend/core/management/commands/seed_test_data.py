"""
Django management command: seed_test_data

WHERE TO PUT THIS FILE
-----------------------
    core/management/__init__.py            <- empty file, create if missing
    core/management/commands/__init__.py   <- empty file, create if missing
    core/management/commands/seed_test_data.py   <- this file

HOW TO RUN
-----------
    python manage.py seed_test_data
    python manage.py seed_test_data --students 15 --faculty 4 --wipe
    python manage.py seed_test_data --purge-legacy   # also deletes your old demo data

PASSWORDS (fixed per role, not configurable via flag)
-------------------------------------------------------
    admin:   pa123456
    student: ps123456
    faculty: pf123456
    parent:  pp123456

This version imports your REAL models directly (core, people, content, ml,
accounts) instead of guessing via apps.get_model(), based on the models.py
files you shared.
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from core.models import University, Department, Batch, Subject, Exam
from people.models import ParentProfile, StudentProfile, FacultyProfile
from content.models import Mark, Attendance, Notice, Resource
from ml.models import RiskAlert

User = get_user_model()

# ---- Indian name pools (mixed regions) ----
FIRST_NAMES_M = [
    "Aarav", "Vivaan", "Aditya", "Krishna", "Ishaan", "Rohan", "Kabir", "Arjun",
    "Yash", "Devansh", "Pranav", "Nikhil", "Rahul", "Siddharth", "Karthik",
    "Manish", "Harsh", "Dhruv", "Raghav", "Vikram", "Amit", "Sanjay", "Suresh",
    "Rajesh", "Anand", "Gaurav", "Naveen", "Abhishek", "Tarun", "Varun",
]
FIRST_NAMES_F = [
    "Ananya", "Diya", "Isha", "Kavya", "Meera", "Priya", "Riya", "Saanvi",
    "Tanvi", "Yashvi", "Aditi", "Neha", "Pooja", "Shreya", "Sneha", "Kritika",
    "Nisha", "Radhika", "Swati", "Divya", "Bhavna", "Aishwarya", "Lavanya",
    "Sanya", "Ritika", "Payal", "Komal", "Simran", "Anjali", "Vidya",
]
LAST_NAMES = [
    "Patel", "Shah", "Mehta", "Desai", "Joshi", "Trivedi", "Pandya", "Gandhi",
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Yadav", "Reddy", "Nair",
    "Iyer", "Menon", "Pillai", "Chatterjee", "Banerjee", "Mukherjee", "Das",
    "Bose", "Kulkarni", "Deshmukh", "Bhosale", "Chauhan", "Rathod", "Solanki",
]

# ---- Role-specific passwords ----
PASSWORDS = {
    "admin": "pa123456",
    "student": "ps123456",
    "faculty": "pf123456",
    "parent": "pp123456",
}

DEPARTMENTS = ["Computer Engineering", "Information Technology", "Mechanical Engineering"]
SUBJECT_NAMES = {
    "Computer Engineering": ["Data Structures", "Operating Systems", "DBMS"],
    "Information Technology": ["Web Technology", "Computer Networks", "Java Programming"],
    "Mechanical Engineering": ["Thermodynamics", "Fluid Mechanics", "Machine Design"],
}


def random_name(used_names):
    """Return a unique (first, last, gender) Indian name combo."""
    while True:
        gender = random.choice(["M", "F"])
        first = random.choice(FIRST_NAMES_M if gender == "M" else FIRST_NAMES_F)
        last = random.choice(LAST_NAMES)
        full = f"{first} {last}"
        if full not in used_names:
            used_names.add(full)
            return first, last


class Command(BaseCommand):
    help = "Seed the database with realistic Indian-name test data via the ORM."

    def add_arguments(self, parser):
        parser.add_argument("--students", type=int, default=12, help="Students per department (default 12)")
        parser.add_argument("--faculty", type=int, default=3, help="Faculty per department (default 3)")
        parser.add_argument("--wipe", action="store_true", help="Delete previously seeded 'Seed Test University' first")
        parser.add_argument(
            "--purge-legacy", action="store_true",
            help="Also permanently delete ALL data NOT under 'Seed Test University' "
                 "(i.e. your old demo/manual data like testadmin@demo.com, std1@gmail.com, etc.)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        n_students = options["students"]
        n_faculty = options["faculty"]
        used_names = set()

        if options["purge_legacy"]:
            legacy_unis = University.objects.exclude(name="Seed Test University")
            legacy_ids = list(legacy_unis.values_list("id", flat=True))
            if legacy_ids:
                self.stdout.write(self.style.WARNING(
                    f"Purging legacy data: {legacy_unis.count()} universities and all their users..."
                ))
                # University FK on profiles/notices/etc is CASCADE, but User.university is
                # SET_NULL, so users must be deleted explicitly or they'd be orphaned.
                User.objects.filter(university_id__in=legacy_ids).delete()
                legacy_unis.delete()
            else:
                self.stdout.write("No legacy universities found, nothing to purge.")

        if options["wipe"]:
            existing = University.objects.filter(name="Seed Test University")
            if existing.exists():
                self.stdout.write("Wiping previous seed data...")
                for uni in existing:
                    User.objects.filter(university=uni).delete()
                existing.delete()

        university, _ = University.objects.get_or_create(name="Seed Test University")
        self.stdout.write(self.style.SUCCESS(f"University: {university}"))

        # ---- Admin ----
        a_first, a_last = random_name(used_names)
        admin_email = "seedadmin@test.com"
        admin_user, created = User.objects.get_or_create(
            username=admin_email,
            defaults=dict(
                email=admin_email,
                first_name=a_first,
                last_name=a_last,
                role="admin",
                is_staff=True,
                is_verified=True,
                university=university,
            ),
        )
        if created:
            admin_user.set_password(PASSWORDS["admin"])
            admin_user.save()

        # ---- Departments ----
        departments = [
            Department.objects.get_or_create(name=name, university=university)[0]
            for name in DEPARTMENTS
        ]

        # ---- Faculty ----
        faculty_by_dept = {}
        for dept in departments:
            profiles = []
            for i in range(n_faculty):
                first, last = random_name(used_names)
                email = f"{first.lower()}.{last.lower()}{i}@seedtest.com"
                user = User(
                    username=email, email=email, first_name=first, last_name=last,
                    role="faculty", is_verified=True, university=university,
                )
                user.set_password(PASSWORDS["faculty"])
                user.save()
                profile = FacultyProfile.objects.create(
                    user=user,
                    university=university,
                    department=dept,
                    designation=random.choice(["Assistant Professor", "Associate Professor", "Professor"]),
                )
                profiles.append(profile)
            faculty_by_dept[dept.id] = profiles
        self.stdout.write(self.style.SUCCESS(
            f"Created {sum(len(v) for v in faculty_by_dept.values())} faculty"
        ))

        # ---- Subjects (faculty FK expects a FacultyProfile, not a User) ----
        subjects_by_dept = {}
        for dept in departments:
            subs = []
            for idx, sname in enumerate(SUBJECT_NAMES[dept.name]):
                subject = Subject.objects.create(
                    name=sname,
                    code=f"{dept.name[:2].upper()}{idx + 1:02d}",
                    department=dept,
                    faculty=random.choice(faculty_by_dept[dept.id]) if faculty_by_dept[dept.id] else None,
                )
                subs.append(subject)
            subjects_by_dept[dept.id] = subs

        # ---- Batches ----
        batch_by_dept = {
            dept.id: Batch.objects.get_or_create(department=dept, name="A1", defaults={"year": 2025})[0]
            for dept in departments
        }

        # ---- Exams (one midterm per subject, valid choice = 'midterm') ----
        exam_by_subject = {}
        for dept in departments:
            for subject in subjects_by_dept[dept.id]:
                exam_by_subject[subject.id] = Exam.objects.create(
                    university=university,
                    title=f"{subject.name} Midterm",
                    exam_type="midterm",
                    date=timezone.now().date() - timedelta(days=10),
                    max_score=50,
                    subject=subject,
                    department=dept,
                )

        # ---- Parents + Students + Marks + Attendance ----
        total_students = 0
        for dept in departments:
            batch = batch_by_dept[dept.id]
            dept_faculty_users = [fp.user for fp in faculty_by_dept[dept.id]] or [admin_user]

            for i in range(n_students):
                # Parent
                p_first, p_last = random_name(used_names)
                p_email = f"{p_first.lower()}.{p_last.lower()}.parent{i}@seedtest.com"
                parent_user = User(
                    username=p_email, email=p_email, first_name=p_first, last_name=p_last,
                    role="parent", is_verified=True, university=university,
                )
                parent_user.set_password(PASSWORDS["parent"])
                parent_user.save()
                parent_profile = ParentProfile.objects.create(user=parent_user, university=university)

                # Student (shares surname with parent)
                s_first, _ = random_name(used_names)
                s_email = f"{s_first.lower()}.{p_last.lower()}.std{i}@seedtest.com"
                student_user = User(
                    username=s_email, email=s_email, first_name=s_first, last_name=p_last,
                    role="student", is_verified=True, university=university,
                )
                student_user.set_password(PASSWORDS["student"])
                student_user.save()
                student_profile = StudentProfile.objects.create(
                    user=student_user,
                    university=university,
                    department=dept,
                    batch=batch,
                    roll_no=f"{dept.name[:2].upper()}{i + 1:03d}",
                    parent=parent_profile,
                )
                total_students += 1

                # Marks + Attendance per subject
                for subject in subjects_by_dept[dept.id]:
                    exam = exam_by_subject[subject.id]
                    marker = random.choice(dept_faculty_users)
                    Mark.objects.create(
                        student=student_profile,
                        subject=subject,
                        exam=exam,
                        score=round(random.uniform(15, 50), 1),
                        max_score=50,
                        added_by=marker,
                    )
                    for day_offset in range(5):
                        Attendance.objects.create(
                            student=student_profile,
                            subject=subject,
                            date=timezone.now().date() - timedelta(days=day_offset),
                            is_present=random.random() > 0.15,
                            marked_by=marker,
                        )

        self.stdout.write(self.style.SUCCESS(
            f"Created {total_students} students (+ parents, marks, attendance)"
        ))

        # ---- Notices & Resources ----
        Notice.objects.create(
            university=university,
            title="Mid-Semester Exam Schedule Released",
            content="The mid-semester examination schedule has been published. Please check the notice board.",
            is_pinned=True,
            created_by=admin_user,
        )
        Notice.objects.create(
            university=university,
            title="Holiday on Account of Diwali",
            content="The institute will remain closed for Diwali celebrations.",
            is_pinned=False,
            created_by=admin_user,
        )
        for dept in departments:
            Resource.objects.create(
                university=university,
                title=f"{dept.name} Lab Manual",
                url="https://example.com/lab-manual.pdf",
                description=f"Reference lab manual for {dept.name} students.",
                department=dept,
                created_by=admin_user,
            )

        # ---- Risk alerts for a couple of random students ----
        sample_students = list(StudentProfile.objects.filter(university=university).order_by("?")[:2])
        for sp in sample_students:
            RiskAlert.objects.create(
                student=sp,
                risk_percent=round(random.uniform(60, 90), 1),
                message="Low attendance and marks detected across multiple subjects.",
            )

        self.stdout.write(self.style.SUCCESS(
            "\nDone. Passwords by role:\n"
            f"  Admin:   {admin_email} / {PASSWORDS['admin']}\n"
            f"  Faculty: <their email> / {PASSWORDS['faculty']}\n"
            f"  Student: <their email> / {PASSWORDS['student']}\n"
            f"  Parent:  <their email> / {PASSWORDS['parent']}"
        ))