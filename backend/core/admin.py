from django.contrib import admin
from .models import University, Department, Batch, Subject, Exam, EnrollmentSequence


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'campus_code', 'created_at')


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'university', 'code')
    list_filter  = ('university',)


admin.site.register(Batch)
admin.site.register(Subject)
admin.site.register(Exam)


@admin.register(EnrollmentSequence)
class EnrollmentSequenceAdmin(admin.ModelAdmin):
    """Read-only view -- these rows must only ever be mutated by
    people.services.generate_enrollment_number, never by hand, or duplicate
    enrollment numbers become possible."""
    list_display  = ('university', 'department', 'admission_year', 'last_serial')
    list_filter   = ('university', 'admission_year')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
