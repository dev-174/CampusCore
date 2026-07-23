from django.contrib import admin
from .models import University, Department, Batch, Subject, Exam

admin.site.register(University)
admin.site.register(Department)
admin.site.register(Batch)
admin.site.register(Subject)
admin.site.register(Exam)
