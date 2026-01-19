"""Initial database schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-01-19 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('email_verified', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('email_verification_token', sa.String(length=255), nullable=True),
        sa.Column('password_reset_token', sa.String(length=255), nullable=True),
        sa.Column('password_reset_expires', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_email_verification_token', 'users', ['email_verification_token'])
    
    # OAuth Accounts table
    op.create_table('oauth_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_user_id', sa.String(length=255), nullable=False),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('provider_data', sa.JSON(), nullable=True),  # JSON для SQLite, JSONB для PostgreSQL
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('provider', 'provider_user_id', name='uq_oauth_provider_user')
    )
    op.create_index('idx_oauth_user_id', 'oauth_accounts', ['user_id'])
    op.create_index('idx_oauth_provider_user', 'oauth_accounts', ['provider', 'provider_user_id'])
    
    # Subscriptions table
    op.create_table('subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan', sa.String(length=50), nullable=False, server_default='free'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('trial_used', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('auto_renew', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('idx_subscriptions_user_id', 'subscriptions', ['user_id'])
    op.create_index('idx_subscriptions_status', 'subscriptions', ['status'])
    op.create_index('idx_subscriptions_expires_at', 'subscriptions', ['expires_at'])
    
    # History table
    op.create_table('history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('base_url', sa.Text(), nullable=False),
        sa.Column('full_url', sa.Text(), nullable=False),
        sa.Column('utm_source', sa.String(length=255), nullable=True),
        sa.Column('utm_medium', sa.String(length=255), nullable=True),
        sa.Column('utm_campaign', sa.String(length=255), nullable=True),
        sa.Column('utm_content', sa.String(length=255), nullable=True),
        sa.Column('utm_term', sa.String(length=255), nullable=True),
        sa.Column('short_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_history_user_id', 'history', ['user_id'])
    op.create_index('idx_history_created_at', 'history', ['created_at'])
    op.create_index('idx_history_user_created', 'history', ['user_id', 'created_at'])
    
    # Templates table
    op.create_table('templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('utm_source', sa.String(length=255), nullable=True),
        sa.Column('utm_medium', sa.String(length=255), nullable=True),
        sa.Column('utm_campaign', sa.String(length=255), nullable=True),
        sa.Column('utm_content', sa.String(length=255), nullable=True),
        sa.Column('utm_term', sa.String(length=255), nullable=True),
        sa.Column('tag_name', sa.String(length=100), nullable=True),
        sa.Column('tag_color', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_templates_user_id', 'templates', ['user_id'])
    op.create_index('idx_templates_created_at', 'templates', ['created_at'])
    op.create_index('idx_templates_user_tag', 'templates', ['user_id', 'tag_name'])
    
    # Payments table
    op.create_table('payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(length=255), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='RUB'),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('plan_id', sa.String(length=50), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('payment_metadata', sa.JSON(), nullable=True),  # Переименовано из metadata (конфликт с SQLAlchemy)
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('external_id')
    )
    op.create_index('idx_payments_user_id', 'payments', ['user_id'])
    op.create_index('idx_payments_external_id', 'payments', ['external_id'])
    op.create_index('idx_payments_status', 'payments', ['status'])
    op.create_index('idx_payments_created_at', 'payments', ['created_at'])


def downgrade() -> None:
    # Удаляем таблицы в обратном порядке (из-за foreign keys)
    op.drop_table('payments')
    op.drop_table('templates')
    op.drop_table('history')
    op.drop_table('subscriptions')
    op.drop_table('oauth_accounts')
    op.drop_table('users')
