from django.contrib import admin
from django.contrib.auth import get_user_model
User = get_user_model()

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'university', 'is_verified')
    list_filter  = ('role', 'university', 'is_verified')
