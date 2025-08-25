import os
import httpx
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from pydantic import BaseModel
import jwt
from google.auth.transport import requests
from google.oauth2 import id_token

from db import get_session
from models import User, UserCreate, UserRead


router = APIRouter(prefix="/auth", tags=["authentication"])

# Environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")


class GoogleTokenRequest(BaseModel):
    token: str


class AuthResponse(BaseModel):
    user: UserRead
    access_token: str


def create_access_token(user_id: str) -> str:
    """Create a JWT access token for the user"""
    payload = {
        "user_id": str(user_id),
        "exp": datetime.now(timezone.utc).timestamp() + 86400  # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_google_token(token: str) -> dict:
    """Verify Google OAuth token and return user info"""
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), GOOGLE_CLIENT_ID
        )
        
        # Additional validation
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
            
        return idinfo
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


@router.post("/google", response_model=AuthResponse)
async def google_oauth(
    token_request: GoogleTokenRequest,
    session: Session = Depends(get_session)
):
    """
    Exchange Google OAuth token for our access token and user data
    """
    # Verify the Google token
    google_user_info = verify_google_token(token_request.token)
    
    google_sub = google_user_info.get("sub")
    email = google_user_info.get("email")
    name = google_user_info.get("name")
    avatar_url = google_user_info.get("picture")
    
    if not google_sub or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required user information from Google"
        )
    
    # Check if user already exists by google_sub
    existing_user = session.exec(
        select(User).where(User.google_sub == google_sub)
    ).first()
    
    if existing_user:
        # Update user info if needed
        if existing_user.avatar_url != avatar_url:
            existing_user.avatar_url = avatar_url
            existing_user.updated_at = datetime.now(timezone.utc)
            session.add(existing_user)
            session.commit()
            session.refresh(existing_user)
        
        user = existing_user
    else:
        # Check if user exists by email (for linking existing accounts)
        email_user = session.exec(
            select(User).where(User.email == email)
        ).first()
        
        if email_user and email_user.google_sub is None:
            # Link existing account to Google
            email_user.google_sub = google_sub
            email_user.avatar_url = avatar_url
            email_user.updated_at = datetime.now(timezone.utc)
            session.add(email_user)
            session.commit()
            session.refresh(email_user)
            user = email_user
        else:
            # Create new user
            new_user = User(
                name=name or email.split("@")[0],
                email=email,
                google_sub=google_sub,
                avatar_url=avatar_url
            )
            session.add(new_user)
            session.commit()
            session.refresh(new_user)
            user = new_user
    
    # Create access token
    access_token = create_access_token(user.id)
    
    return AuthResponse(
        user=UserRead.model_validate(user),
        access_token=access_token
    )


@router.get("/me", response_model=UserRead)
async def get_current_user(
    session: Session = Depends(get_session),
    # You'll need to implement token verification middleware
    # For now, this is a placeholder
):
    """
    Get current user from JWT token
    This endpoint would typically use a dependency to extract and verify the JWT
    """
    # This is a placeholder - you'd implement JWT verification here
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="JWT verification not yet implemented"
    )
