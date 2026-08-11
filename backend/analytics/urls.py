from django.urls import path
from .views import MarksSummaryView, AttendanceSummaryView, OutliersView, CorrelationView

urlpatterns = [
    path('summary/',     MarksSummaryView.as_view()),
    path('attendance/',  AttendanceSummaryView.as_view()),
    path('outliers/',    OutliersView.as_view()),
    path('correlation/', CorrelationView.as_view()),
]
