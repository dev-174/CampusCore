from django.urls import path
from .views import StudentReportPDFView, MyReportPDFView, ClassReportPDFView

urlpatterns = [
    path('student/<int:student_id>/pdf/', StudentReportPDFView.as_view()),
    path('my-report/pdf/',                MyReportPDFView.as_view()),
    path('class/pdf/',                    ClassReportPDFView.as_view()),
]
