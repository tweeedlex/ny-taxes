from io import BytesIO
from urllib.parse import quote

from minio import Minio

from src.core.config import settings


class MinioStorage:
    def __init__(self) -> None:
        self._bucket = settings.minio_bucket
        self._client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

    @property
    def bucket(self) -> str:
        return self._bucket

    @property
    def base_url(self) -> str:
        if settings.minio_public_base_url:
            return settings.minio_public_base_url.rstrip("/")
        scheme = "https" if settings.minio_secure else "http"
        return f"{scheme}://{settings.minio_endpoint}"

    def ensure_bucket(self) -> None:
        if not self._client.bucket_exists(self._bucket):
            self._client.make_bucket(self._bucket)

    def upload_bytes(self, object_name: str, content: bytes, content_type: str) -> str:
        self._client.put_object(
            bucket_name=self._bucket,
            object_name=object_name,
            data=BytesIO(content),
            length=len(content),
            content_type=content_type,
        )
        return object_name

    def get_object_bytes(self, object_name: str) -> bytes:
        response = self._client.get_object(self._bucket, object_name)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def object_url(self, object_name: str) -> str:
        encoded_segments = [quote(segment, safe="") for segment in object_name.split("/")]
        encoded_object = "/".join(encoded_segments)
        return f"{self.base_url}/{self._bucket}/{encoded_object}"
