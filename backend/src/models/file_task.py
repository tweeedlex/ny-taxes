from tortoise import fields
from tortoise.models import Model


class FileTask(Model):
    id = fields.IntField(pk=True)
    user = fields.ForeignKeyField("models.User", related_name="file_tasks")
    file_path = fields.CharField(max_length=512)
    successful_rows = fields.IntField(default=0)
    failed_rows = fields.IntField(default=0)
    status = fields.CharField(max_length=32, index=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "file_tasks"

