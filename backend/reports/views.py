from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from content.models import Mark, Attendance
from people.models import StudentProfile
from core.models import Batch, TeachingAssignment
from ml.views import compute_risk

from .pdf_utils import build_student_report_pdf, build_class_report_pdf


def _can_access_student(user, student):
    """Same access rules used elsewhere for marks/attendance: admin sees
    their whole university, faculty only students in a batch they actually
    teach, parents only their own children, students only themselves."""
    if student.university_id != getattr(user, 'university_id', None):
        return False
    if user.role == 'admin':
        return True
    if user.role == 'faculty':
        faculty_profile = getattr(user, 'faculty_profile', None)
        if not faculty_profile:
            return False
        return TeachingAssignment.objects.filter(
            faculty=faculty_profile, batch_id=student.batch_id
        ).exists()
    if user.role == 'parent':
        parent_profile = getattr(user, 'parent_profile', None)
        return bool(parent_profile) and student.parent_id == parent_profile.id
    if user.role == 'student':
        return getattr(user, 'student_profile', None) and student.id == user.student_profile.id
    return False


def _student_pdf_response(student):
    marks_qs = (
        Mark.objects.filter(student=student)
        .select_related('subject', 'exam')
        .order_by('subject__name', 'exam__date')
    )
    marks_rows = [{
        'subject':   m.subject.name if m.subject else '—',
        'exam':      m.exam.title if m.exam else '—',
        'score':     m.score,
        'max_score': m.max_score,
        'pct':       round((m.score / m.max_score) * 100, 1) if m.max_score else 0.0,
    } for m in marks_qs]

    valid_marks = [m for m in marks_rows if m['max_score']]
    overall_marks_pct = (
        round(sum(m['pct'] for m in valid_marks) / len(valid_marks), 1)
        if valid_marks else None
    )

    attendance_qs = Attendance.objects.filter(student=student).select_related('subject')
    by_subject = {}
    for a in attendance_qs:
        key = a.subject.name if a.subject else '—'
        entry = by_subject.setdefault(key, {'present': 0, 'total': 0})
        entry['total'] += 1
        if a.is_present:
            entry['present'] += 1
    attendance_rows = []
    total_present, total_all = 0, 0
    for subject, stats in sorted(by_subject.items()):
        pct = round((stats['present'] / stats['total']) * 100, 1) if stats['total'] else 0.0
        attendance_rows.append({
            'subject': subject, 'present': stats['present'], 'total': stats['total'], 'pct': pct,
        })
        total_present += stats['present']
        total_all += stats['total']
    overall_attendance_pct = round(total_present / total_all * 100, 1) if total_all else None

    # ML risk status -- best-effort; report still generates fine without it
    risk_info = None
    try:
        current_df, message = compute_risk(student.university)
        if current_df is not None:
            match = current_df[current_df['roll_no'] == student.roll_no]
            if not match.empty:
                row = match.iloc[0]
                level = 'high' if (row['predicted_risk'] == 1 and row['risk_%'] >= 70) else (
                    'medium' if row['predicted_risk'] == 1 else 'low'
                )
                risk_info = {'level': level, 'risk_%': float(row['risk_%'])}
    except Exception:
        risk_info = None

    buffer = build_student_report_pdf(
        university_name=student.university.name,
        student_name=student.user.get_full_name() or student.user.email,
        roll_no=student.roll_no,
        enrollment_number=student.enrollment_number,
        department_name=student.department.name if student.department else None,
        batch_name=student.batch.name if student.batch else None,
        marks_rows=marks_rows,
        attendance_rows=attendance_rows,
        overall_marks_pct=overall_marks_pct,
        overall_attendance_pct=overall_attendance_pct,
        risk_info=risk_info,
    )

    filename = f"report_{(student.enrollment_number or student.roll_no or student.id)}.pdf"
    response = HttpResponse(buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


class StudentReportPDFView(APIView):
    """GET /api/reports/student/<id>/pdf/ -- combined report card for one student."""
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        try:
            student = StudentProfile.objects.select_related(
                'user', 'university', 'department', 'batch'
            ).get(pk=student_id)
        except StudentProfile.DoesNotExist:
            return Response({'detail': 'Student not found.'}, status=404)

        if not _can_access_student(request.user, student):
            return Response({'detail': 'You do not have access to this student\'s report.'}, status=403)

        return _student_pdf_response(student)


class MyReportPDFView(APIView):
    """GET /api/reports/my-report/pdf/ -- student downloads their own report card."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'student':
            return Response({'detail': 'Only students can use this endpoint.'}, status=403)
        student = getattr(request.user, 'student_profile', None)
        if not student:
            return Response({'detail': 'No student profile found for this account.'}, status=404)
        return _student_pdf_response(student)


class ClassReportPDFView(APIView):
    """
    GET /api/reports/class/pdf/?batch=<id>
    Bulk summary (roll no, name, avg marks %, attendance %, risk) for every
    student in a batch. Admin sees any batch in their university; faculty
    only batches they're actually assigned to teach via TeachingAssignment.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        batch_id = request.query_params.get('batch')
        if not batch_id:
            return Response({'detail': 'A batch query parameter is required.'}, status=400)

        try:
            batch = Batch.objects.select_related('department', 'department__university').get(pk=batch_id)
        except Batch.DoesNotExist:
            return Response({'detail': 'Batch not found.'}, status=404)

        user = request.user
        if batch.department.university_id != getattr(user, 'university_id', None):
            return Response({'detail': 'Not found.'}, status=404)

        if user.role == 'admin':
            pass
        elif user.role == 'faculty':
            faculty_profile = getattr(user, 'faculty_profile', None)
            allowed = bool(faculty_profile) and TeachingAssignment.objects.filter(
                faculty=faculty_profile, batch=batch
            ).exists()
            if not allowed:
                return Response({'detail': 'You are not assigned to teach this batch.'}, status=403)
        else:
            return Response({'detail': 'Only admins and faculty can export class reports.'}, status=403)

        students = StudentProfile.objects.filter(batch=batch).select_related('user')

        # Reuse the shared ML risk computation once for the whole university.
        risk_by_roll = {}
        try:
            current_df, _ = compute_risk(batch.department.university)
            if current_df is not None:
                for row in current_df.to_dict(orient='records'):
                    level = 'high' if (row['predicted_risk'] == 1 and row['risk_%'] >= 70) else (
                        'medium' if row['predicted_risk'] == 1 else 'low'
                    )
                    risk_by_roll[row['roll_no']] = level
        except Exception:
            risk_by_roll = {}

        rows = []
        for s in students:
            marks_qs = Mark.objects.filter(student=s)
            pcts = [(m.score / m.max_score) * 100 for m in marks_qs if m.max_score]
            avg_marks_pct = round(sum(pcts) / len(pcts), 1) if pcts else None

            att_qs = Attendance.objects.filter(student=s)
            att_total = att_qs.count()
            att_pct = round(att_qs.filter(is_present=True).count() / att_total * 100, 1) if att_total else None

            rows.append({
                'roll_no': s.roll_no,
                'enrollment_number': s.enrollment_number,
                'name': s.user.get_full_name() or s.user.email,
                'avg_marks_pct': avg_marks_pct,
                'attendance_pct': att_pct,
                'risk_level': risk_by_roll.get(s.roll_no),
            })
        rows.sort(key=lambda r: (r['roll_no'] or ''))

        buffer = build_class_report_pdf(
            university_name=batch.department.university.name,
            batch_name=batch.name,
            department_name=batch.department.name,
            rows=rows,
        )
        filename = f"class_report_{batch.name.replace(' ', '_')}.pdf"
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
