from django.utils import timezone
from rest_framework import serializers
from .models import University, Department, Batch, Subject, Exam, TeachingAssignment


class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = University
        fields = ['id', 'name', 'code', 'campus_code', 'created_at']
        read_only_fields = ['code', 'created_at']


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Department
        fields = ['id', 'university', 'name', 'code']
        read_only_fields = ['university']

    def validate_code(self, value):
        value = (value or '').strip()
        if value:
            if len(value) == 1 and value.isdigit():
                value = f"{int(value):02d}"
            if not (value.isdigit() and len(value) == 2):
                raise serializers.ValidationError(
                    "Department code must be exactly 2 digits (e.g. '03'), since "
                    "it is embedded directly into student enrollment numbers."
                )
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        university = getattr(request.user, 'university', None) if request and hasattr(request, 'user') else None

        code = attrs.get('code', '')

        # Auto-generate next 2-digit numeric code if omitted/blank on creation
        if not code and not self.instance and university:
            used = set(Department.objects.filter(university=university).values_list('code', flat=True))
            n = 1
            while f"{n:02d}" in used and n < 100:
                n += 1
            if n >= 100:
                raise serializers.ValidationError({"code": "Maximum department limit (99) reached for this university."})
            attrs['code'] = f"{n:02d}"

        # Uniqueness check for code within the same university
        code_to_check = attrs.get('code')
        if university and code_to_check:
            qs = Department.objects.filter(university=university, code=code_to_check)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"code": f"Department code '{code_to_check}' is already in use by another department."})

        return super().validate(attrs)


class BatchSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model  = Batch
        fields = ['id', 'department', 'department_name', 'name', 'year']

    def validate(self, attrs):
        department = attrs.get('department', getattr(self.instance, 'department', None))
        name = attrs.get('name', getattr(self.instance, 'name', None))

        # Check if department is being modified on an existing batch with dependencies
        if self.instance and 'department' in attrs and attrs['department'] != self.instance.department:
            from people.models import StudentProfile
            deps = []
            students_count = StudentProfile.objects.filter(batch=self.instance).count()
            if students_count > 0:
                deps.append(f"{students_count} student(s)")
            ta_count = self.instance.teaching_assignments.count()
            if ta_count > 0:
                deps.append(f"{ta_count} teaching assignment(s)")

            if deps:
                raise serializers.ValidationError({
                    'department': f"Cannot change department of batch '{self.instance.name}' because it is associated with {', '.join(deps)}."
                })

        # Uniqueness check for (department, name)
        if department and name:
            name_val = str(name).strip()
            qs = Batch.objects.filter(department=department, name__iexact=name_val)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'name': f"A batch named '{name_val}' already exists in department '{department.name}'."
                })

        return super().validate(attrs)



class SubjectSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    faculty_name    = serializers.SerializerMethodField()

    class Meta:
        model  = Subject
        fields = ['id', 'department', 'department_name', 'name', 'code', 'faculty', 'faculty_name']

    def get_faculty_name(self, obj):
        if obj.faculty:
            return obj.faculty.user.get_full_name() or obj.faculty.user.username
        return None

    def validate(self, attrs):
        code = attrs.get('code', getattr(self.instance, 'code', None))
        if code:
            code_clean = str(code).strip()
            if code_clean:
                qs = Subject.objects.filter(code__iexact=code_clean)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({
                        'detail': f"This subject code '{code_clean}' is already in use. Please enter a unique code."
                    })
        return super().validate(attrs)



class TeachingAssignmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    batch_name   = serializers.CharField(source='batch.name', read_only=True)
    faculty_name = serializers.SerializerMethodField()
    department   = serializers.IntegerField(source='subject.department_id', read_only=True)

    class Meta:
        model  = TeachingAssignment
        fields = ['id', 'subject', 'subject_name', 'batch', 'batch_name',
                  'faculty', 'faculty_name', 'department', 'created_at']
        read_only_fields = ['created_at']

    def get_faculty_name(self, obj):
        return obj.faculty.user.get_full_name() or obj.faculty.user.username

    def validate(self, data):
        subject = data.get('subject', getattr(self.instance, 'subject', None))
        batch   = data.get('batch', getattr(self.instance, 'batch', None))
        if subject and batch and subject.department_id != batch.department_id:
            raise serializers.ValidationError(
                'Subject and batch must belong to the same department.'
            )
        return data


class ExamSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    subject_name    = serializers.CharField(source='subject.name', read_only=True, allow_null=True)

    class Meta:
        model  = Exam
        fields = ['id', 'university', 'title', 'exam_type', 'date', 'max_score',
                  'subject', 'subject_name', 'department', 'department_name', 'created_at']
        read_only_fields = ['university', 'created_at']

    def validate_date(self, value):
        if value and value < timezone.now().date():
            raise serializers.ValidationError("Exam date cannot be in the past.")
        return value