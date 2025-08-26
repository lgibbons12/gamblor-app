"""
Authentication system for Gamblor API.
Validates JWT tokens and provides user context for endpoints.
"""

import os
import jwt
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from uuid import UUID
from typing import Optional

from db import get_session
from models import User

# Environment variables
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

# Security scheme for automatic Bearer token extraction
security = HTTPBearer(auto_error=False)


def verify_token(token: str) -> dict:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Check if token is expired
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


def get_user_from_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """
    Extract user from JWT token and validate against database.
    This is the main authentication dependency.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    # Verify the token
    payload = verify_token(credentials.credentials)
    user_id_str = payload.get("user_id")
    
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user_id"
        )
    
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: malformed user_id"
        )
    
    # Get user from database
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


def get_current_user_id(user: User = Depends(get_user_from_token)) -> UUID:
    """Get current user ID from authenticated user."""
    return user.id


def get_current_user(user: User = Depends(get_user_from_token)) -> User:
    """Get current authenticated user."""
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session)
) -> Optional[User]:
    """
    Optional authentication for public endpoints.
    Returns user if valid token provided, None otherwise.
    """
    if not credentials:
        return None
    
    try:
        payload = verify_token(credentials.credentials)
        user_id_str = payload.get("user_id")
        
        if not user_id_str:
            return None
        
        user_id = UUID(user_id_str)
        user = session.get(User, user_id)
        return user
    except (HTTPException, ValueError):
        return None


def get_optional_user_id(
    user: Optional[User] = Depends(get_optional_user)
) -> Optional[UUID]:
    """Get optional user ID for public endpoints."""
    return user.id if user else None


# Legacy fallback for header-based auth (development/testing)
def get_user_id_from_header(
    x_user_id: Optional[str] = Header(None),
    session: Session = Depends(get_session)
) -> Optional[UUID]:
    """
    Fallback authentication via X-User-ID header.
    Only use for development/testing when JWT is not available.
    """
    if not x_user_id:
        return None
    
    try:
        user_id = UUID(x_user_id)
        # Verify user exists
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format for X-User-ID header"
        )
