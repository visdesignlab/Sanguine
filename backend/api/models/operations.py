from django.db import models


class DerivedArtifactRefresh(models.Model):
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = (
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
    )

    artifact_name = models.CharField(max_length=64, unique=True)
    definition_hash = models.CharField(max_length=64)
    last_refreshed_at = models.DateTimeField(null=True, blank=True)
    last_row_count = models.BigIntegerField(null=True, blank=True)
    last_status = models.CharField(max_length=16, choices=STATUS_CHOICES)
    last_error = models.TextField(blank=True)

    class Meta:
        db_table = "DerivedArtifactRefresh"
        ordering = ["artifact_name"]

    def __str__(self) -> str:
        return self.artifact_name
