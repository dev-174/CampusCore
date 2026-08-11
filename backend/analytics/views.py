import math
import pandas as pd
import numpy as np
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from content.models import Mark, Attendance


def sanitize_records(data):
    """
    Clean NaN/Inf numbers in list/dict/DataFrame so JSON serialization never fails.
    """
    if isinstance(data, pd.DataFrame):
        data = data.replace([np.inf, -np.inf], 0).fillna(0).to_dict(orient='records')

    def _clean(val):
        if isinstance(val, dict):
            return {k: _clean(v) for k, v in val.items()}
        if isinstance(val, list):
            return [_clean(item) for item in val]
        if pd.isna(val):
            return 0.0
        if isinstance(val, (np.floating, np.integer)):
            val = val.item()
        if isinstance(val, float):
            if math.isnan(val) or math.isinf(val):
                return 0.0
            return round(val, 2)
        return val

    return _clean(data)


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
            return Response([])
        
        df['percentage'] = np.where(df['max_score'] > 0, (df['score'] / df['max_score']) * 100, 0.0)
        df['percentage'] = pd.to_numeric(df['percentage'], errors='coerce').fillna(0.0)

        summary = df.groupby('subject__name')['percentage'].describe().round(2)
        summary = summary.replace([np.inf, -np.inf], 0).fillna(0)
        records = summary.reset_index().to_dict(orient='records')
        return Response(sanitize_records(records))


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
        result['attendance_%'] = np.where(result['total'] > 0, (result['present'] / result['total']) * 100, 0.0)
        result.rename(columns={'student__enrollment_number': 'enrollment_number'}, inplace=True)
        result = result.replace([np.inf, -np.inf], 0).fillna(0)
        return Response(sanitize_records(result.to_dict(orient='records')))


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
        df['pct'] = np.where(df['max_score'] > 0, (df['score'] / df['max_score']) * 100, 0.0)
        avg = df.groupby(['student__roll_no', 'student__enrollment_number', 'student__user__first_name'])['pct'].mean()
        std_val = avg.std()
        if pd.isna(std_val) or math.isnan(std_val):
            std_val = 0.0
        mean_val = avg.mean()
        if pd.isna(mean_val) or math.isnan(mean_val):
            mean_val = 0.0
        threshold = mean_val - 2 * std_val
        outliers  = avg[avg < threshold].reset_index()
        outliers.columns = ['roll_no', 'enrollment_number', 'name', 'avg_%']
        outliers['avg_%'] = outliers['avg_%'].round(1)
        outliers = outliers.replace([np.inf, -np.inf], 0).fillna(0)
        return Response(sanitize_records(outliers.to_dict(orient='records')))


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
            return Response({'message': 'Not enough data.', 'correlation': 0.0})

        df_m['pct'] = np.where(df_m['max_score'] > 0, (df_m['score'] / df_m['max_score']) * 100, 0.0)
        avg_marks   = df_m.groupby('student__roll_no')['pct'].mean().reset_index(name='avg_marks_%')
        att_pct     = df_a.groupby('student__roll_no')['is_present'].mean().mul(100).reset_index(name='attendance_%')
        merged      = avg_marks.merge(att_pct, on='student__roll_no')
        corr        = merged[['avg_marks_%', 'attendance_%']].corr().round(4)
        corr        = corr.replace([np.inf, -np.inf], 0).fillna(0)
        return Response(sanitize_records(corr.to_dict()))
