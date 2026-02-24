from tortoise import fields
from tortoise.models import Model


class User(Model):
    id = fields.IntField(pk=True)
    login = fields.CharField(max_length=64, unique=True, index=True)
    password_hash = fields.CharField(max_length=255)
    full_name = fields.CharField(max_length=255, null=True)
    is_active = fields.BooleanField(default=True)
    authorities = fields.JSONField(default=list)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "users"

