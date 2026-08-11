from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


class UsernameOrEmailBackend(ModelBackend):
    """
    Custom authentication backend that allows logging in using
    either username OR email address alongside the password.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('email')
        if not username:
            return None

        username_clean = username.strip()

        user = User.objects.filter(
            Q(username__iexact=username_clean) | Q(email__iexact=username_clean)
        ).first()

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
