"""add ranked fields to league profile

Revision ID: 6a6861231a9a
Revises: a8b5ec1ba47c
Create Date: 2026-10-13 14:19:12.243155

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a6861231a9a'
down_revision: Union[str, Sequence[str], None] = 'a8b5ec1ba47c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "league_profiles",
        sa.Column(
            "tier",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "league_profiles",
        sa.Column(
            "rank_division",
            sa.String(length=10),
            nullable=True,
        ),
    )

    op.add_column(
        "league_profiles",
        sa.Column(
            "league_points",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "league_profiles",
        sa.Column(
            "ranked_wins",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "league_profiles",
        sa.Column(
            "ranked_losses",
            sa.Integer(),
            nullable=True,
        ),
    )
    

def downgrade():
    op.drop_column(
        "league_profiles",
        "ranked_losses",
    )

    op.drop_column(
        "league_profiles",
        "ranked_wins",
    )

    op.drop_column(
        "league_profiles",
        "league_points",
    )

    op.drop_column(
        "league_profiles",
        "rank_division",
    )

    op.drop_column(
        "league_profiles",
        "tier",
    )