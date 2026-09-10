"""add datasource owner column

Revision ID: 7a8910bc0011
Revises: f849d10bc933
Create Date: 2026-09-09 21:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '7a8910bc0011'
down_revision = 'f849d10bc933'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'data_sources',
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='SET NULL'), nullable=True)
    )
    op.create_index('ix_data_sources_created_by_user_id', 'data_sources', ['created_by_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_data_sources_created_by_user_id', table_name='data_sources')
    op.drop_column('data_sources', 'created_by_user_id')
