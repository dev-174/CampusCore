from rest_framework import serializers
from .models import University, Department, Batch, Subject, Exam, TeachingAssignment


class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = University
        fields = ['id', 'name', 'code', 'created_at']
        read_only_fields = ['code', 'created_at']


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Department
        fields = ['id', 'university', 'name']
        read_only_fields = ['university']


class BatchSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model  = Batch
        fields = ['id', 'department', 'department_name', 'name', 'year']


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