"""make ledger_entries.inning_id nullable

Revision ID: fix_ledger_entries
Revises: 7f1fa72657ab
Create Date: 2025-01-20 16:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fix_ledger_entries'
down_revision: Union[str, Sequence[str], None] = '7f1fa72657ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make inning_id nullable in ledger_entries table."""
    # Alter the inning_id column to allow NULL values
    op.alter_column('ledger_entries', 'inning_id',
                    existing_type=sa.UUID(),
                    nullable=True)


def downgrade() -> None:
    """Make inning_id NOT NULL in ledger_entries table."""
    # First, we'd need to delete any rows with NULL inning_id or set them to some value
    # For simplicity, this just makes it NOT NULL again
    op.alter_column('ledger_entries', 'inning_id',
                    existing_type=sa.UUID(),
                    nullable=False)
