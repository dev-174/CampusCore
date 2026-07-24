import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from content.models import Mark, Attendance
from people.models import StudentProfile


class MarksSummaryView(APIView):
    """Per-subject stats: mean, std, min, max, pass/fail count."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        uni = request.user.university
        qs  = Mark.objects.filter(student__university=uni).values(
            'subject__name', 'score', 'max_score'
        )
        df = pd.DataFrame(list(qs))
        if df.empty:
            return Response({'message': 'No marks data yet.'})
        df['percentage'] = (df['score'] / df['max_score']) * 100
        summary = df.groupby('subject__name')['percentage'].describe().round(2)
        return Response(summary.reset_index().to_dict(orient='records'))


class AttendanceSummaryView(APIView):
    """Attendance % per student."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        uni = request.user.university
        qs  = Attendance.objects.filter(student__university=uni).values(
            'student__roll_no', 'student__enrollment_number', 'student__user__first_name', 'is_present'
        )
        df = pd.DataFrame(list(qs))
        if df.empty:
            return Response([])
        grp = df.groupby(['student__roll_no', 'student__enrollment_number', 'student__user__first_name'])['is_present']
        result = grp.agg(present='sum', total='count').reset_index()
        result['attendance_%'] = ((result['present'] / result['total']) * 100).round(1)
        result.rename(columns={'student__enrollment_number': 'enrollment_number'}, inplace=True)
        return Response(result.to_dict(orient='records'))


class OutliersView(APIView):
    """Students whose avg score is below (mean - 2*std): likely at-risk."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        uni = request.user.university
        qs  = Mark.objects.filter(student__university=uni).values(
            'student__roll_no', 'student__enrollment_number', 'student__user__first_name', 'score', 'max_score'
        )
        df = pd.DataFrame(list(qs))
        if df.empty:
            return Response([])
        df['pct'] = (df['score'] / df['max_score']) * 100
        avg = df.groupby(['student__roll_no', 'student__enrollment_number', 'student__user__first_name'])['pct'].mean()
        threshold = avg.mean() - 2 * avg.std()
        outliers  = avg[avg < threshold].reset_index()
        outliers.columns = ['roll_no', 'enrollment_number', 'name', 'avg_%']
        outliers['avg_%'] = outliers['avg_%'].round(1)
        return Response(outliers.to_dict(orient='records'))


class CorrelationView(APIView):
    """Correlation between attendance % and avg marks %."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        uni = request.user.university
        marks = Mark.objects.filter(student__university=uni).values('student__roll_no', 'score', 'max_score')
        att   = Attendance.objects.filter(student__university=uni).values('student__roll_no', 'is_present')

        df_m = pd.DataFrame(list(marks))
        df_a = pd.DataFrame(list(att))
        if df_m.empty or df_a.empty:
            return Response({'message': 'Not enough data.'})

        df_m['pct'] = (df_m['score'] / df_m['max_score']) * 100
        avg_marks   = df_m.groupby('student__roll_no')['pct'].mean().reset_index(name='avg_marks_%')
        att_pct     = df_a.groupby('student__roll_no')['is_present'].mean().mul(100).reset_index(name='attendance_%')
        merged      = avg_marks.merge(att_pct, on='student__roll_no')
        corr        = merged[['avg_marks_%', 'attendance_%']].corr().round(4)
        return Response(corr.to_dict())
