from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    auth_provider: Mapped[str] = mapped_column(
        String(30),
        default="beta",
        nullable=False,
        index=True,
    )

    provider_user_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
        unique=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    riot_accounts = relationship(
        "RiotAccount",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    beta_sessions = relationship(
        "BetaSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )