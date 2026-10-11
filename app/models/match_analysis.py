from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)

from sqlalchemy.types import JSON

from app.database.database import (
    Base,
)


class MatchAnalysis(Base):

    __tablename__ = "match_analyses"

    __table_args__ = (
        UniqueConstraint(
            "riot_account_id",
            "match_id",
            "analysis_version",
            name=
                "uq_match_analysis_account_match_version",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Internal DB Match.id
    match_id = Column(
        Integer,
        ForeignKey(
            "matches.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    riot_account_id = Column(
        Integer,
        ForeignKey(
            "riot_accounts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # Riot participant id inside the match, normally 1–10.
    participant_id = Column(
        Integer,
        nullable=False,
    )

    analysis_version = Column(
        String(32),
        nullable=False,
        index=True,
    )

    analysis_json = Column(
        JSON,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )