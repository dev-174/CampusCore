import numpy as np
import pandas as pd
from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score, mean_absolute_error

from content.models import Mark, Attendance
from people.models import StudentProfile
from .models import RiskAlert

PASS_THRESHOLD = 40  # % below this on an exam counts as a fail


def _student_exam_series(student):
    """[(exam_date, pct), ...] ordered chronologically, one entry per exam
    (averaged across subjects if a student has multiple marks for one exam)."""
    marks = Mark.objects.filter(student=student).select_related('exam').order_by('exam__date', 'exam_id')
    by_exam = {}
    for m in marks:
        key = (m.exam.date, m.exam_id)
        pct = (m.score / m.max_score) * 100
        by_exam.setdefault(key, []).append(pct)
    ordered = sorted(by_exam.items(), key=lambda kv: (kv[0][0] is None, kv[0][0]))
    return [(k[0], sum(v) / len(v)) for k, v in ordered]


def _attendance_pct(student, upto_date=None):
    qs = Attendance.objects.filter(student=student)
    if upto_date is not None:
        qs = qs.filter(date__lte=upto_date)
    total = qs.count()
    if not total:
        return None
    present = qs.filter(is_present=True).count()
    return present / total * 100


def _trend_slope(values):
    """Linear trend slope over a sequence of exam percentages. Positive = improving."""
    if len(values) < 2:
        return 0.0
    x = np.arange(len(values))
    y = np.array(values)
    return round(float(np.polyfit(x, y, 1)[0]), 3)


def build_training_rows(university):
    """
    Genuine supervised pairs: for every student with >=2 exams, features come
    from all exams EXCEPT the last one, and the label is whether they actually
    failed that held-out last exam. Attendance is cut off at the last history
    exam's date so nothing "in the future" leaks into the features.
    """
    students = StudentProfile.objects.filter(university=university)
    rows = []
    for s in students:
        series = _student_exam_series(s)
        if len(series) < 2:
            continue
        history = series[:-1]
        _, last_pct = series[-1]
        cutoff_date = history[-1][0]
        hist_pcts = [pct for (_, pct) in history]

        att = _attendance_pct(s, upto_date=cutoff_date)
        if att is None:
            continue

        rows.append({
            'roll_no': s.roll_no,
            'enrollment_number': s.enrollment_number,
            'name': s.user.get_full_name() or s.user.email,
            'avg_marks_%': round(sum(hist_pcts) / len(hist_pcts), 2),
            'trend_slope': _trend_slope(hist_pcts),
            'attendance_%': round(att, 2),
            'failed_next': int(last_pct < PASS_THRESHOLD),
        })
    return pd.DataFrame(rows)


def build_current_features(university):
    """Each student's full history right now, used to forecast their NEXT
    (not-yet-happened) exam -- this is the live 'who is at risk today' view."""
    students = StudentProfile.objects.filter(university=university)
    rows = []
    for s in students:
        series = _student_exam_series(s)
        if not series:
            continue
        pcts = [pct for (_, pct) in series]
        att = _attendance_pct(s)
        if att is None:
            continue
        rows.append({
            'roll_no': s.roll_no,
            'enrollment_number': s.enrollment_number,
            'name': s.user.get_full_name() or s.user.email,
            'avg_marks_%': round(sum(pcts) / len(pcts), 2),
            'trend_slope': _trend_slope(pcts),
            'attendance_%': round(att, 2),
        })
    return pd.DataFrame(rows)


FEATURE_COLS = ['avg_marks_%', 'trend_slope', 'attendance_%']


def compute_risk(university):
    """
    Single source of truth for risk prediction. Trains the RandomForest on
    real history->real outcome pairs, applies it to each student's current
    full history, and returns (current_df with risk_%/predicted_risk columns,
    None) on success, or (None, message) if there isn't enough real history.

    Every place that needs risk data (AtRiskView, the lightweight risk-summary
    endpoint, and later the dashboard/students-page badges) calls this ONE
    function instead of re-training its own model.
    """
    train_df = build_training_rows(university)

    if len(train_df) < 6 or train_df['failed_next'].nunique() < 2:
        return None, (
            'Not enough exam history yet to train a real predictive model '
            '(need students with at least 2 exams each, with both pass and '
            'fail outcomes represented in that history).'
        )

    X = train_df[FEATURE_COLS].values
    y = train_df['failed_next'].values

    model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')

    accuracy = None
    if len(train_df) >= 10:
        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y
        )
        model.fit(X_tr, y_tr)
        accuracy = round(accuracy_score(y_te, model.predict(X_te)) * 100, 1)
        model.fit(X, y)  # refit on all history for the live prediction
    else:
        model.fit(X, y)

    current_df = build_current_features(university)
    if current_df.empty:
        return None, 'No students with attendance/marks data yet.'

    X_live = current_df[FEATURE_COLS].values
    current_df['risk_%'] = (model.predict_proba(X_live)[:, 1] * 100).round(1)
    current_df['predicted_risk'] = model.predict(X_live)

    current_df.attrs['trained_on'] = len(train_df)
    current_df.attrs['accuracy'] = accuracy
    return current_df, None


def generate_risk_alerts(current_df, university):
    """
    Create a RiskAlert for each newly high-risk student, skipping anyone who
    already got one in the last 7 days -- so this can safely run on every
    page load (Dashboard, Students page) without spamming duplicate alerts.
    """
    if current_df is None:
        return
    high_risk = current_df[
        (current_df['predicted_risk'] == 1) & (current_df['risk_%'] >= 70)
    ]
    if high_risk.empty:
        return

    cutoff = timezone.now() - timedelta(days=7)
    for row in high_risk.to_dict(orient='records'):
        student = StudentProfile.objects.filter(
            university=university, roll_no=row['roll_no']
        ).first()
        if not student:
            continue
        recent_exists = RiskAlert.objects.filter(
            student=student, created_at__gte=cutoff
        ).exists()
        if recent_exists:
            continue
        RiskAlert.objects.create(
            student=student,
            risk_percent=row['risk_%'],
            message=(
                f"{row['name']} ({row['roll_no']}) is predicted at {row['risk_%']}% "
                f"risk of failing the next exam, based on recent marks trend and attendance."
            ),
        )


class AtRiskView(APIView):
    """
    RandomForest trained on real history -> real outcome pairs (did the
    student actually fail their most recent exam, given only what was known
    before it). Applied to each student's full current history to forecast
    risk on their NEXT exam -- a genuine forward prediction, not a restatement
    of current status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_df, message = compute_risk(request.user.university)
        if current_df is None:
            return Response({'message': message})

        at_risk = (
            current_df[current_df['predicted_risk'] == 1]
            [['roll_no', 'enrollment_number', 'name', 'avg_marks_%', 'trend_slope', 'attendance_%', 'risk_%']]
            .sort_values('risk_%', ascending=False)
            .to_dict(orient='records')
        )
        accuracy = current_df.attrs.get('accuracy')

        return Response({
            'total_students': len(current_df),
            'at_risk_count': len(at_risk),
            'trained_on': f"{current_df.attrs.get('trained_on')} students' real exam history",
            'accuracy': f"{accuracy}%" if accuracy else "N/A (need >=10 students with history to hold out a test set)",
            'at_risk_students': at_risk,
        })


class RiskSummaryView(APIView):
    """
    Lightweight endpoint for badges/cards embedded in OTHER pages (Students
    list, Dashboard) so they don't each re-train a model just to show a
    badge. Returns a plain {roll_no: {risk_%, level}} map -- cheap to
    consume, one shared computation.

    Also the trigger point for auto-generating RiskAlert rows, since this is
    the endpoint that runs during normal workflow pages (not the standalone
    ML page) -- this is what makes risk detection "proactive" rather than
    something admin has to go looking for.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_df, message = compute_risk(request.user.university)
        if current_df is None:
            return Response({'summary': {}, 'message': message})

        generate_risk_alerts(current_df, request.user.university)

        summary = {}
        for row in current_df.to_dict(orient='records'):
            risk_pct = row['risk_%']
            if row['predicted_risk'] == 1:
                level = 'high' if risk_pct >= 70 else 'medium'
            else:
                level = 'low'
            summary[row['roll_no']] = {'risk_%': risk_pct, 'level': level}

        return Response({'summary': summary})


class MyAlertsView(APIView):
    """
    Returns risk alerts scoped to the logged-in user:
    - parent -> alerts for their own children only
    - faculty -> alerts for students in subjects they actually teach
    - anyone else -> empty list
    Nobody can see another family's or another faculty's alerts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'parent':
            parent_profile = getattr(user, 'parent_profile', None)
            if not parent_profile:
                return Response({'alerts': []})
            alerts = RiskAlert.objects.filter(student__parent=parent_profile)

        elif user.role == 'faculty':
            faculty_profile = getattr(user, 'faculty_profile', None)
            if not faculty_profile:
                return Response({'alerts': []})
            from core.models import TeachingAssignment
            # Faculty sees alerts only for students in batches they actually
            # teach (any subject), via TeachingAssignment. This replaces the
            # old buggy `Mark.objects.filter(subject__faculty=user)`, which
            # compared a FacultyProfile-typed FK against a raw User instance
            # and would never match correctly.
            batch_ids = (
                TeachingAssignment.objects
                .filter(faculty=faculty_profile)
                .values_list('batch_id', flat=True)
                .distinct()
            )
            alerts = RiskAlert.objects.filter(student__batch_id__in=batch_ids)
        else:
            return Response({'alerts': []})

        alerts = alerts.select_related('student').order_by('-created_at')[:50]
        data = [{
            'id': a.id,
            'student_name': a.student.user.get_full_name() or a.student.user.email,
            'roll_no': a.student.roll_no,
            'enrollment_number': a.student.enrollment_number,
            'risk_percent': a.risk_percent,
            'message': a.message,
            'created_at': a.created_at,
            'is_read': a.is_read_by_parent if user.role == 'parent' else a.is_read_by_faculty,
        } for a in alerts]

        return Response({'alerts': data})

    def post(self, request):
        """Mark one alert as read for the current user's role."""
        alert_id = request.data.get('id')
        alert = RiskAlert.objects.filter(id=alert_id).first()
        if not alert:
            return Response({'detail': 'Not found.'}, status=404)
        if request.user.role == 'parent':
            alert.is_read_by_parent = True
        elif request.user.role == 'faculty':
            alert.is_read_by_faculty = True
        alert.save()
        return Response({'ok': True})


class PredictScoreView(APIView):
    """LinearRegression: predict marks from attendance. Unchanged -- this one
    was never circular (it predicts a different variable than its input)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        df = build_current_features(request.user.university)
        if df.empty or len(df) < 3:
            return Response({'message': 'Need at least 3 students with data.'})

        X = df[['attendance_%']].values
        y = df['avg_marks_%'].values

        model = LinearRegression()
        model.fit(X, y)

        y_pred = model.predict(X)
        df['predicted_%'] = y_pred.round(2)

        return Response({
            'r2_score': round(r2_score(y, y_pred), 4),
            'mae': round(mean_absolute_error(y, y_pred), 2),
            'predictions': df[['roll_no', 'enrollment_number', 'name', 'attendance_%', 'avg_marks_%', 'predicted_%']].to_dict(orient='records'),
        })