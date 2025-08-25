from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator
from dotenv import load_dotenv

from sqlmodel import Session, create_engine

load_dotenv()


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return database_url


# Create a global engine; SQLModel uses a synchronous engine by default
engine = create_engine(get_database_url(), pool_pre_ping=True)


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_session() -> Generator[Session, None, None]:
    with session_scope() as session:
        yield session

