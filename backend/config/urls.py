from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/',      include('accounts.urls')),
    path('api/',           include('core.urls')),
    path('api/',           include('people.urls')),
    path('api/',           include('content.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/ml/',        include('ml.urls')),
    path('api/reports/',   include('reports.urls')),
]
