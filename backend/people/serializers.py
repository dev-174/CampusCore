from rest_framework import serializers
from .models import StudentProfile, FacultyProfile, ParentProfile


class StudentSerializer(serializers.ModelSerializer):
    name            = serializers.CharField(source='user.get_full_name', read_only=True)
    email           = serializers.EmailField(source='user.email', read_only=True)
    is_verified     = serializers.BooleanField(source='user.is_verified', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    batch_name      = serializers.CharField(source='batch.name', read_only=True)

    class Meta:
        model  = StudentProfile
        fields = ['id', 'name', 'email', 'is_verified', 'roll_no',
                  'department', 'department_name', 'batch', 'batch_name', 'parent',
                  'admission_year', 'enrollment_number']
        read_only_fields = ['enrollment_number']


class FacultySerializer(serializers.ModelSerializer):
    name            = serializers.CharField(source='user.get_full_name', read_only=True)
    email           = serializers.EmailField(source='user.email', read_only=True)
    is_verified     = serializers.BooleanField(source='user.is_verified', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model  = FacultyProfile
        fields = ['id', 'name', 'email', 'is_verified', 'department', 'department_name', 'designation']


class ParentSerializer(serializers.ModelSerializer):
    name        = serializers.CharField(source='user.get_full_name', read_only=True)
    email       = serializers.EmailField(source='user.email', read_only=True)
    is_verified = serializers.BooleanField(source='user.is_verified', read_only=True)
    children    = StudentSerializer(many=True, read_only=True)

    class Meta:
        model  = ParentProfile
        fields = ['id', 'name', 'email', 'is_verified', 'children']


class StudentPreviewSerializer(serializers.ModelSerializer):
    name            = serializers.CharField(source='user.get_full_name', read_only=True)
    email           = serializers.EmailField(source='user.email', read_only=True)
    is_verified     = serializers.BooleanField(source='user.is_verified', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    batch_name      = serializers.CharField(source='batch.name', read_only=True)
    phone_number    = serializers.CharField(source='user.phone_number', read_only=True)
    profile_photo   = serializers.CharField(source='user.profile_photo', read_only=True)

    class Meta:
        model  = StudentProfile
        fields = ['id', 'name', 'email', 'is_verified', 'roll_no',
                  'department_name', 'batch_name', 'phone_number', 'profile_photo',
                  'admission_year', 'enrollment_number']


class FacultyPreviewSerializer(serializers.ModelSerializer):
    name            = serializers.CharField(source='user.get_full_name', read_only=True)
    email           = serializers.EmailField(source='user.email', read_only=True)
    is_verified     = serializers.BooleanField(source='user.is_verified', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    phone_number    = serializers.CharField(source='user.phone_number', read_only=True)
    profile_photo   = serializers.CharField(source='user.profile_photo', read_only=True)

    class Meta:
        model  = FacultyProfile
        fields = ['id', 'name', 'email', 'is_verified', 'employee_id',
                  'department_name', 'designation', 'phone_number', 'profile_photo']


class ParentPreviewSerializer(serializers.ModelSerializer):
    name         = serializers.CharField(source='user.get_full_name', read_only=True)
    email        = serializers.EmailField(source='user.email', read_only=True)
    is_verified  = serializers.BooleanField(source='user.is_verified', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    profile_photo = serializers.CharField(source='user.profile_photo', read_only=True)
    children     = StudentPreviewSerializer(many=True, read_only=True)

    class Meta:
        model  = ParentProfile
        fields = ['id', 'name', 'email', 'is_verified', 'children', 'phone_number', 'profile_photo']
