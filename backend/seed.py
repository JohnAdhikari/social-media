"""Seed the Zone Media database with a demo account (idempotent)."""

import secrets
import hmac
import hashlib
from datetime import datetime, timezone

from app import connect, init_db


def connect_db():
    init_db()
    return connect()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: str) -> str:
    return hmac.new(salt.encode(), password.encode(), hashlib.sha256).hexdigest()


DEMO_USERNAME = "John Adhikari"
DEMO_EMAIL = "john@example.com"
DEMO_PASSWORD = "demo1234"


def seed_demo(conn) -> None:
    existing = conn.execute(
        "SELECT id, is_demo FROM users WHERE username = %s OR email = %s",
        (DEMO_USERNAME, DEMO_EMAIL),
    ).fetchone()
    if existing:
        salt = secrets.token_hex(16)
        conn.execute(
            "UPDATE users SET password_salt = %s, password_hash = %s, is_demo = 1 WHERE id = %s",
            (salt, hash_password(DEMO_PASSWORD, salt), existing["id"]),
        )
        conn.commit()
        print(f"Re-hashed demo account password: {DEMO_USERNAME}")
        return
    salt = secrets.token_hex(16)
    conn.execute(
        "INSERT INTO users (username, email, password_salt, password_hash, bio, is_demo, created_at) VALUES (%s, %s, %s, %s, %s, 1, %s)",
        (DEMO_USERNAME, DEMO_EMAIL, salt, hash_password(DEMO_PASSWORD, salt), "Your Bio", now_iso()),
    )
    conn.commit()
    print(f"Created demo account: {DEMO_USERNAME}")


def seed():
    conn = connect_db()
    try:
        seed_demo(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
