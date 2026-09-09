import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.identity import Role, Profile
from app.models.auth import UserSession
from app.auth.security import hash_password, verify_password, generate_session_token, hash_session_token

logger = logging.getLogger("cyberscope.auth")

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def seed_default_users(db: Session) -> None:
    """
    Safely seeds default application roles (SOC_ANALYST, ALERT_SOURCE)
    and local development accounts if they do not exist yet.
    """
    try:
        # Seed Roles
        soc_role = db.scalar(select(Role).where(Role.name == "SOC_ANALYST"))
        if not soc_role:
            soc_role = Role(name="SOC_ANALYST", description="SOC Analyst Operational Role")
            db.add(soc_role)
            db.flush()

        source_role = db.scalar(select(Role).where(Role.name == "ALERT_SOURCE"))
        if not source_role:
            source_role = Role(name="ALERT_SOURCE", description="Synthetic Alert Generator Source Role")
            db.add(source_role)
            db.flush()

        # Seed Analyst User
        analyst_user = db.scalar(select(Profile).where(Profile.username == "analyst"))
        if not analyst_user:
            analyst_pass = os.getenv("SEED_ANALYST_PASSWORD", "Analyst123!")
            analyst_user = Profile(
                username="analyst",
                email="analyst@cyberscope.local",
                full_name="SOC Lead Analyst",
                role_id=soc_role.id,
                is_active=True,
                is_superuser=False,
                hashed_password=hash_password(analyst_pass)
            )
            db.add(analyst_user)

        # Seed Alert Source User
        alert_source_user = db.scalar(select(Profile).where(Profile.username == "alert_source"))
        if not alert_source_user:
            source_pass = os.getenv("SEED_ALERT_SOURCE_PASSWORD", "Source123!")
            alert_source_user = Profile(
                username="alert_source",
                email="source@cyberscope.local",
                full_name="Synthetic Alert Generator",
                role_id=source_role.id,
                is_active=True,
                is_superuser=False,
                hashed_password=hash_password(source_pass)
            )
            db.add(alert_source_user)

        # Seed Default Alert Source Entity
        from app.models.sources import AlertSource
        default_source = db.scalar(select(AlertSource).where(AlertSource.name == "Synthetic Scenario Generator"))
        if not default_source:
            default_source = AlertSource(
                name="Synthetic Scenario Generator",
                source_type="SYNTHETIC",
                status="ACTIVE",
                source_metadata={"description": "Built-in synthetic alert generator source"}
            )
            db.add(default_source)

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding default users: {e}")

ALLOWED_SIGNUP_ROLES = {"SOC_ANALYST", "ALERT_SOURCE"}

def register_user_account(
    db: Session,
    full_name: str,
    username: str,
    email: str,
    password: str,
    role_name: str
) -> Profile:
    """
    Registers a new user account with server-side validation and password hashing.
    Strictly validates role against ALLOWED_SIGNUP_ROLES.
    """
    clean_username = username.strip().lower()
    clean_email = email.strip().lower()
    clean_role = role_name.strip().upper()

    if clean_role not in ALLOWED_SIGNUP_ROLES:
        raise ValueError(f"Invalid role '{role_name}'. Permitted roles are: SOC_ANALYST, ALERT_SOURCE.")

    # Check username uniqueness
    existing_user = db.scalar(select(Profile).where(func.lower(Profile.username) == clean_username))
    if existing_user:
        raise ValueError("Username is already registered. Please choose a different username.")

    # Check email uniqueness
    existing_email = db.scalar(select(Profile).where(func.lower(Profile.email) == clean_email))
    if existing_email:
        raise ValueError("Email address is already registered. Please use a different email.")

    # Fetch role
    role = db.scalar(select(Role).where(Role.name == clean_role))
    if not role:
        role = Role(name=clean_role, description=f"{clean_role} User Role")
        db.add(role)
        db.flush()

    new_profile = Profile(
        username=clean_username,
        email=clean_email,
        full_name=full_name.strip(),
        role_id=role.id,
        is_active=True,
        is_superuser=False,
        hashed_password=hash_password(password)
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile

def authenticate_user(db: Session, username: str, password: str) -> Optional[Profile]:
    """
    Authenticates a user against credentials.
    Verifies user exists, is active, and password matches.
    """
    # Lookup by username or email
    stmt = select(Profile).where(
        (Profile.username == username) | (Profile.email == username)
    )
    profile = db.scalar(stmt)
    if not profile:
        return None
    if not profile.is_active:
        return None
    if not verify_password(password, profile.hashed_password or ""):
        return None
    
    # Update last login timestamp
    profile.last_login_at = utc_now()
    db.commit()
    return profile

def create_user_session(db: Session, profile: Profile, expires_in_hours: int = 24) -> str:
    """
    Generates a new session, hashes the token before DB storage,
    and returns the raw session token.
    """
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)
    expires_at = utc_now() + timedelta(hours=expires_in_hours)

    session = UserSession(
        profile_id=profile.id,
        token_hash=token_hash,
        expires_at=expires_at,
        is_revoked=False,
        created_at=utc_now(),
        last_used_at=utc_now()
    )
    db.add(session)
    db.commit()
    return raw_token

def validate_session_token(db: Session, raw_token: str) -> Optional[Profile]:
    """
    Validates a raw session token, ensures it is active and unexpired,
    updates last_used_at timestamp, and returns the associated Profile.
    """
    if not raw_token:
        return None
    
    token_hash = hash_session_token(raw_token)
    stmt = select(UserSession).where(
        UserSession.token_hash == token_hash,
        UserSession.is_revoked == False,
        UserSession.expires_at > utc_now()
    )
    session = db.scalar(stmt)
    if not session:
        return None

    # Check associated profile status
    profile = session.profile
    if not profile or not profile.is_active:
        return None

    # Update last used timestamp
    session.last_used_at = utc_now()
    db.commit()
    return profile

def revoke_session_token(db: Session, raw_token: str) -> bool:
    """
    Revokes/invalidates a session token.
    """
    if not raw_token:
        return False
    
    token_hash = hash_session_token(raw_token)
    stmt = select(UserSession).where(UserSession.token_hash == token_hash)
    session = db.scalar(stmt)
    if session:
        session.is_revoked = True
        db.commit()
        return True
    return False
