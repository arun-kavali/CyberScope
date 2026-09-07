"""
SQLAlchemy Declarative Base for CyberScope.
Models in Phase 3+ will inherit from this Base class.
"""
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy declarative models.
    """
    pass
