from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterUniversityView, RegisterAdminView,
    ClaimVerifyView, ClaimSetPasswordView, LoginView,
    ProfileView, ChangePasswordView,
)

urlpatterns = [
    path('register-university/', RegisterUniversityView.as_view()),
    path('register-admin/',      RegisterAdminView.as_view()),
    path('claim/verify/',        ClaimVerifyView.as_view()),
    path('claim/set-password/',  ClaimSetPasswordView.as_view()),
    path('login/',               LoginView.as_view()),
    path('token/refresh/',       TokenRefreshView.as_view()),
    path('profile/',             ProfileView.as_view(), name='profile'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
]
