from tortoise import fields
from tortoise.models import Model


class TaxRate(Model):
    id = fields.IntField(pk=True)
    reporting_code = fields.CharField(max_length=32, unique=True, index=True)
    jurisdictions = fields.JSONField()

    class Meta:
        table = "tax_rates"
        indexes = (("reporting_code",),)
