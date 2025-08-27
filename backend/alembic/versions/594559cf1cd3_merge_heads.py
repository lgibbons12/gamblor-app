"""merge heads

Revision ID: 594559cf1cd3
Revises: 6f01e351fb59
Create Date: 2025-08-26 12:48:06.721589

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
import pgvector


# revision identifiers, used by Alembic.
revision: str = '594559cf1cd3'
down_revision: Union[str, Sequence[str], None] = '6f01e351fb59'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass