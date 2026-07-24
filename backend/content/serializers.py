from rest_framework import serializers
from .models import Mark, Attendance, Notice, Resource


class MarkSerializer(serializers.ModelSerializer):
    student_name      = serializers.CharField(source='student.user.get_full_name', read_only=True)
    roll_no           = serializers.CharField(source='student.roll_no', read_only=True)
    enrollment_number = serializers.CharField(source='student.enrollment_number', read_only=True)
    subject_name      = serializers.CharField(source='subject.name', read_only=True)
    exam_title        = serializers.CharField(source='exam.title', read_only=True)
    percentage        = serializers.SerializerMethodField()

    class Meta:
        model  = Mark
        fields = ['id', 'student', 'student_name', 'roll_no', 'enrollment_number',
                  'subject', 'subject_name', 'exam', 'exam_title',
                  'score', 'max_score', 'percentage', 'created_at']
        read_only_fields = ['created_at']

    def get_percentage(self, obj):
        return round((obj.score / obj.max_score) * 100, 1) if obj.max_score else 0


class AttendanceSerializer(serializers.ModelSerializer):
    student_name      = serializers.CharField(source='student.user.get_full_name', read_only=True)
    roll_no           = serializers.CharField(source='student.roll_no', read_only=True)
    enrollment_number = serializers.CharField(source='student.enrollment_number', read_only=True)
    subject_name      = serializers.CharField(source='subject.name', read_only=True)
    batch_name        = serializers.CharField(source='student.batch.name', read_only=True)

    class Meta:
        model  = Attendance
        fields = ['id', 'student', 'student_name', 'roll_no', 'enrollment_number',
                  'subject', 'subject_name', 'batch_name', 'date', 'is_present']


class NoticeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model  = Notice
        fields = ['id', 'title', 'content', 'is_pinned', 'created_by_name', 'created_at']
        read_only_fields = ['created_at']


class ResourceSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)

    class Meta:
        model  = Resource
        fields = ['id', 'title', 'url', 'description', 'department', 'department_name', 'created_at']
        read_only_fields = ['created_at']