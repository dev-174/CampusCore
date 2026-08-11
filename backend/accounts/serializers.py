from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import University

User = get_user_model()


class RegisterUniversitySerializer(serializers.Serializer):
    """Create a new university + first admin account."""
    university_name = serializers.CharField(max_length=200)
    name            = serializers.CharField(max_length=150)
    username        = serializers.CharField(max_length=150)
    email           = serializers.EmailField()
    password        = serializers.CharField(write_only=True, min_length=8)

    def validate_university_name(self, value):
        if University.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("University name already taken.")
        return value

    def validate_username(self, value):
        val_clean = value.strip()
        if User.objects.filter(username__iexact=val_clean).exists():
            raise serializers.ValidationError("Username already taken.")
        return val_clean

    def validate_email(self, value):
        val_clean = value.strip().lower()
        if User.objects.filter(email__iexact=val_clean).exists():
            raise serializers.ValidationError("Email already in use.")
        return val_clean

    def create(self, validated_data):
        university = University.objects.create(name=validated_data['university_name'])
        user = User.objects.create_user(
            username=validated_data['username'].strip(),
            email=validated_data['email'].strip().lower(),
            first_name=validated_data['name'],
            password=validated_data['password'],
            role='admin',
            university=university,
            is_verified=True,
        )
        return {'university': university, 'user': user}


class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name')
    university_name = serializers.CharField(source='university.name', read_only=True)
    university_code = serializers.CharField(source='university.code', read_only=True)
    organization = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'name', 'role',
            'phone_number', 'profile_photo', 'date_of_birth',
            'gender', 'blood_group', 'address',
            'date_joined', 'last_login', 'is_active',
            'university_name', 'university_code', 'organization'
        ]
        read_only_fields = [
            'id', 'role',
            'date_joined', 'last_login', 'is_active',
            'university_name', 'university_code'
        ]

    def validate_date_of_birth(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def validate_username(self, value):
        user = self.instance
        val_clean = value.strip()
        if not val_clean:
            raise serializers.ValidationError("Username cannot be empty.")
        if user and User.objects.filter(username__iexact=val_clean).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Username already taken.")
        return val_clean

    def validate_email(self, value):
        user = self.instance
        val_clean = value.strip().lower()
        if not val_clean:
            raise serializers.ValidationError("Email cannot be empty.")
        if user and User.objects.filter(email__iexact=val_clean).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Email already in use.")
        return val_clean

    def get_organization(self, obj):
        from people.models import StudentProfile, FacultyProfile, AdminProfile, ParentProfile
        
        if obj.role == 'student':
            try:
                prof = StudentProfile.objects.select_related('department', 'batch').get(user=obj)
                return {
                    'id': prof.id,
                    'department_name': prof.department.name if prof.department else None,
                    'batch_name': prof.batch.name if prof.batch else None,
                    'roll_no': prof.roll_no,
                    'enrollment_number': prof.enrollment_number
                }
            except StudentProfile.DoesNotExist:
                return None
        elif obj.role == 'faculty':
            try:
                prof = FacultyProfile.objects.select_related('department').get(user=obj)
                return {
                    'employee_id': prof.employee_id or None,
                    'department_name': prof.department.name if prof.department else None,
                    'designation': prof.designation or None
                }
            except FacultyProfile.DoesNotExist:
                return None
        elif obj.role == 'admin':
            try:
                prof, _ = AdminProfile.objects.get_or_create(user=obj, defaults={'university': obj.university})
                return {
                    'employee_id': prof.employee_id or None,
                    'department_name': prof.department.name if prof.department else None,
                    'designation': prof.designation or None
                }
            except AdminProfile.DoesNotExist:
                return None
        elif obj.role == 'parent':
            try:
                prof = ParentProfile.objects.get(user=obj)
                children = prof.children.all()
                serialized_children = []
                for child in children:
                    serialized_children.append({
                        'id': child.id,
                        'name': child.user.get_full_name() or child.user.username,
                        'roll_no': child.roll_no,
                        'enrollment_number': child.enrollment_number,
                        'email': child.user.email,
                        'department_name': child.department.name if child.department else None,
                        'batch_name': child.batch.name if child.batch else None
                    })
                return {
                    'children': serialized_children
                }
            except ParentProfile.DoesNotExist:
                return None
        return None
