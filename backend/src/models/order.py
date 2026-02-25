from tortoise import fields
from tortoise.models import Model


class Order(Model):
    id = fields.IntField(pk=True)
    user = fields.ForeignKeyField(
        "models.User",
        related_name="orders",
        null=True,
        on_delete=fields.SET_NULL,
    )

    latitude = fields.FloatField()
    longitude = fields.FloatField()
    subtotal = fields.DecimalField(max_digits=12, decimal_places=2)
    timestamp = fields.DatetimeField()

    reporting_code = fields.CharField(max_length=32, index=True)
    jurisdictions = fields.JSONField()
    composite_tax_rate = fields.DecimalField(max_digits=7, decimal_places=5)
    tax_amount = fields.DecimalField(max_digits=12, decimal_places=2)
    total_amount = fields.DecimalField(max_digits=12, decimal_places=2)

    state_rate = fields.DecimalField(max_digits=7, decimal_places=5)
    county_rate = fields.DecimalField(max_digits=7, decimal_places=5)
    city_rate = fields.DecimalField(max_digits=7, decimal_places=5)
    special_rates = fields.DecimalField(max_digits=7, decimal_places=5)

    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "orders"
        indexes = (
            ("reporting_code", "timestamp"),
            ("timestamp",),
        )
