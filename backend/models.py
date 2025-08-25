from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID as PyUUID, uuid4
from sqlalchemy import Column, JSON, BigInteger, String, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, JSON as SAJSON, BigInteger, Text

# ======================
# BASE MODELS
# ======================

class UserBase(SQLModel):
    name: str
    email: str
    google_sub: Optional[str] = None
    avatar_url: Optional[str] = None


class User(UserBase, table=True):
    __tablename__ = "users"

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    google_sub: Optional[str] = Field(default=None, unique=True, index=True)
    avatar_url: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(UserBase):
    google_sub: Optional[str] = None
    avatar_url: Optional[str] = None


class UserRead(UserBase):
    id: PyUUID
    created_at: datetime
    updated_at: datetime
