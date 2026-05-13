from django.db import models
from enum import Enum


# Helper Enum classes
class AccessLevel(Enum):
    READER = 'RE'
    WRITER = 'WR'

    @classmethod
    def choices(self):
        return tuple((i.name, i.value) for i in self)


# Actual models
class State(models.Model):
    name = models.CharField(max_length=128, unique=True, default="New State")
    definition = models.TextField()
    owner = models.CharField(max_length=128, default="NA")
    public = models.BooleanField(default=False)


class StateAccess(models.Model):
    state = models.ForeignKey(State, on_delete=models.CASCADE)
    user = models.CharField(max_length=128)
    role = models.CharField(
        max_length=6,
        choices=AccessLevel.choices(),
        default=AccessLevel.READER,
    )

    class Meta:
        unique_together = ['state', 'user']


class DataExclusion(models.Model):
    VISIT = 'visit'
    SURGERY_CASE = 'surgery_case'
    RECORD_TYPE_CHOICES = [
        (VISIT, 'Visit'),
        (SURGERY_CASE, 'Surgery Case'),
    ]

    record_type = models.CharField(max_length=20, choices=RECORD_TYPE_CHOICES)
    record_id = models.CharField(max_length=100)  # visit_no or case_id as string
    flag_key = models.CharField(max_length=100)
    excluded_by = models.CharField(max_length=128)
    excluded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'DataExclusion'
        unique_together = [['record_type', 'record_id']]