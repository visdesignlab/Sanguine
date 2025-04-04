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