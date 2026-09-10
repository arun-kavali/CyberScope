"""add workspace_id column to profiles

Revision ID: 8b9921cd0012
Revises: 7a8910bc0011
Create Date: 2026-09-10 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '8b9921cd0012'
down_revision = '7a8910bc0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'profiles',
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_index('ix_profiles_workspace_id', 'profiles', ['workspace_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_profiles_workspace_id', table_name='profiles')
    op.drop_column('profiles', 'workspace_id')
