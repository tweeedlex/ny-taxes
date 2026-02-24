from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..core.authorities import ALL_AUTHORITIES


def _normalize_authorities(authorities: list[str]) -> list[str]:
    unique = sorted(set(authorities))
    unknown = set(unique) - ALL_AUTHORITIES
    if unknown:
        supported = ", ".join(sorted(ALL_AUTHORITIES))
        requested = ", ".join(sorted(unknown))
        raise ValueError(f"Unknown authorities: {requested}. Supported: {supported}")
    return unique


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    full_name: str | None
    is_active: bool
    authorities: list[str]
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    login: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    is_active: bool = True
    authorities: list[str] = Field(default_factory=list)

    @field_validator("authorities")
    @classmethod
    def validate_authorities(cls, authorities: list[str]) -> list[str]:
        return _normalize_authorities(authorities)


class UserUpdate(BaseModel):
    login: str | None = Field(default=None, min_length=3, max_length=64)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    authorities: list[str] | None = None

    @field_validator("authorities")
    @classmethod
    def validate_authorities(cls, authorities: list[str] | None) -> list[str] | None:
        if authorities is None:
            return None
        return _normalize_authorities(authorities)
