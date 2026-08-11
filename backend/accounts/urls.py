from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterUniversityView,
    ClaimVerifyView, ClaimSetPasswordView, LoginView,
    ProfileView, ChangePasswordView,
    PasswordResetRequestOTPView, PasswordResetVerifyOTPView, PasswordResetConfirmView,
)

urlpatterns = [
    path('register-university/', RegisterUniversityView.as_view()),
    path('claim/verify/',        ClaimVerifyView.as_view()),
    path('claim/set-password/',  ClaimSetPasswordView.as_view()),
    path('login/',               LoginView.as_view()),
    path('token/refresh/',       TokenRefreshView.as_view()),
    path('profile/',             ProfileView.as_view(), name='profile'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('forgot-password/request-otp/',    PasswordResetRequestOTPView.as_view(), name='forgot-password-request-otp'),
    path('forgot-password/verify-otp/',     PasswordResetVerifyOTPView.as_view(), name='forgot-password-verify-otp'),
    path('forgot-password/reset-password/', PasswordResetConfirmView.as_view(), name='forgot-password-reset-password'),
]

