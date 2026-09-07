"""create ai_intelligence table

Revision ID: e739f41ab892
Revises: dda6c53da02a
Create Date: 2026-09-07 14:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'e739f41ab892'
down_revision = 'dda6c53da02a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'ai_intelligence',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=False),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('intelligence_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False),
        sa.Column('structured_output', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('evidence_references', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('prompt_version', sa.String(length=20), server_default='1.0', nullable=False),
        sa.Column('intelligence_version', sa.String(length=20), server_default='1.0', nullable=False),
        sa.Column('error_info', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_intelligence_target_type', 'ai_intelligence', ['target_type'], unique=False)
    op.create_index('ix_ai_intelligence_target_id', 'ai_intelligence', ['target_id'], unique=False)
    op.create_index('ix_ai_intelligence_intelligence_type', 'ai_intelligence', ['intelligence_type'], unique=False)
    op.create_index('ix_ai_intelligence_status', 'ai_intelligence', ['status'], unique=False)
    op.create_index('ix_ai_intelligence_created_at', 'ai_intelligence', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_ai_intelligence_created_at', table_name='ai_intelligence')
    op.drop_index('ix_ai_intelligence_status', table_name='ai_intelligence')
    op.drop_index('ix_ai_intelligence_intelligence_type', table_name='ai_intelligence')
    op.drop_index('ix_ai_intelligence_target_id', table_name='ai_intelligence')
    op.drop_index('ix_ai_intelligence_target_type', table_name='ai_intelligence')
    op.drop_table('ai_intelligence')
