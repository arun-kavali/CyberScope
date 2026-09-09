"""add user ownership columns

Revision ID: f849d10bc933
Revises: e739f41ab892
Create Date: 2026-09-09 19:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f849d10bc933'
down_revision = 'e739f41ab892'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'alerts',
        sa.Column('submitted_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='SET NULL'), nullable=True)
    )
    op.create_index('ix_alerts_submitted_by_user_id', 'alerts', ['submitted_by_user_id'], unique=False)

    op.add_column(
        'investigations',
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='SET NULL'), nullable=True)
    )
    op.create_index('ix_investigations_created_by_user_id', 'investigations', ['created_by_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_investigations_created_by_user_id', table_name='investigations')
    op.drop_column('investigations', 'created_by_user_id')

    op.drop_index('ix_alerts_submitted_by_user_id', table_name='alerts')
    op.drop_column('alerts', 'submitted_by_user_id')
