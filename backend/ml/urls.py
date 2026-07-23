from django.urls import path
from .views import AtRiskView, PredictScoreView, RiskSummaryView, MyAlertsView

urlpatterns = [
    path('at-risk/',       AtRiskView.as_view()),
    path('predict-score/', PredictScoreView.as_view()),
    path('risk-summary/',  RiskSummaryView.as_view()),
    path('my-alerts/',     MyAlertsView.as_view()),
]