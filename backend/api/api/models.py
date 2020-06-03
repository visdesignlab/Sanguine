from django.db import models

class State(models.Model):
  name = models.CharField(max_length = 128, unique = True, default = "New State")
  definition = models.TextField()
