from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from uuid import UUID
from pydantic import BaseModel

from db import get_session
from models import User, UserCreate, UserRead


router = APIRouter(prefix="/users", tags=["users"])




@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, session: Session = Depends(get_session)):
    now = datetime.now(timezone.utc)
    user = User(
        name=payload.name,
        email=payload.email,
        google_sub=payload.google_sub,
        avatar_url=payload.avatar_url
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.get("", response_model=List[UserRead])
def list_users(session: Session = Depends(get_session)):

    results = session.exec(select(User)).all()


    return results

