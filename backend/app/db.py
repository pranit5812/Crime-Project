from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv

from sqlalchemy import Boolean, DateTime, Float, Integer, LargeBinary, String, Text, create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

_BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _strip_env_quotes(value: str) -> str:
    v = value.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
        return v[1:-1]
    return v


def _postgres_connect_from_env() -> tuple[URL, dict] | None:
    """Build URL without embedding password (avoids URL encoding issues)."""
    user = (os.getenv("POSTGRES_USER") or "").strip()
    if not user or "POSTGRES_PASSWORD" not in os.environ:
        return None
    password = _strip_env_quotes(os.getenv("POSTGRES_PASSWORD", ""))
    # 127.0.0.1 avoids localhost -> IPv6 (::1) vs IPv4 quirks on Windows.
    host = (os.getenv("POSTGRES_HOST") or "127.0.0.1").strip()
    port = int((os.getenv("POSTGRES_PORT") or "5432").strip())
    database = (os.getenv("POSTGRES_DB") or "crime_project").strip()
    url = URL.create(
        drivername="postgresql+psycopg",
        username=user,
        host=host,
        port=port,
        database=database,
    )
    return url, {"password": password}


def _create_engine():
    # Always prefer values from backend/.env over inherited shell / Windows env vars.
    load_dotenv(dotenv_path=_BACKEND_ROOT / ".env", override=True)
    pg = _postgres_connect_from_env()
    if pg is not None:
        url, connect_args = pg
        return create_engine(url, connect_args=connect_args, pool_pre_ping=True)
    explicit = (os.getenv("DATABASE_URL") or "").strip()
    if explicit:
        return create_engine(explicit, pool_pre_ping=True)
    raise RuntimeError(
        "PostgreSQL is required. In backend/.env set POSTGRES_USER, POSTGRES_PASSWORD, "
        "and optionally POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB. "
        "Then run in psql (as superuser): CREATE DATABASE crime_project; "
        "and ensure ALTER USER ... PASSWORD matches POSTGRES_PASSWORD."
    )


engine = _create_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)

DATABASE_URL = engine.url.render_as_string(hide_password=True)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    state: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="citizen")
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class Otp(Base):
    __tablename__ = "otps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    otp: Mapped[str] = mapped_column(String(16), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[str | None] = mapped_column(String(36), unique=True, index=True, nullable=True)
    state: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    region: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    time: Mapped[str] = mapped_column(String(32), nullable=False)
    crime_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    weapon: Mapped[str] = mapped_column(String(16), nullable=False)
    vehicle: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    phone: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    vehicle_selection: Mapped[str] = mapped_column(String(32), nullable=False, default="None")

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    user_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    is_panic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    file_bytes: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    voice_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    voice_content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    voice_bytes: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    voice_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    kind: Mapped[str] = mapped_column(String(64), nullable=False, default="info")
    report_public_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


def get_db_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
