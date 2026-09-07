import hashlib
import secrets
import bcrypt

def hash_password(password: str) -> str:
    """
    Hashes a plain text password using bcrypt.
    Truncates to 72 bytes if needed (bcrypt maximum limit).
    """
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a stored bcrypt hash.
    """
    if not hashed_password or not plain_password:
        return False
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def generate_session_token() -> str:
    """
    Generates a cryptographically secure random session token.
    """
    return secrets.token_urlsafe(32)

def hash_session_token(token: str) -> str:
    """
    Computes a SHA-256 hash of the raw session token.
    Only the hashed token is stored in the database.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
