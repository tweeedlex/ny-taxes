from tortoise import fields
from tortoise.models import Model


class TaxRegion(Model):
    id = fields.IntField(pk=True)
    region_type = fields.CharField(max_length=16, index=True)
    reporting_code = fields.CharField(max_length=32, index=True)

    bbox_min_lon = fields.FloatField()
    bbox_min_lat = fields.FloatField()
    bbox_max_lon = fields.FloatField()
    bbox_max_lat = fields.FloatField()

    points = fields.JSONField()
    parts = fields.JSONField()

    class Meta:
        table = "tax_regions"
        indexes = (
            ("region_type", "reporting_code"),
            ("region_type",),
            ("reporting_code",),
        )
