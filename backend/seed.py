"""Seed the Zone Media database with sample posts + demo account (idempotent)."""

from datetime import datetime, timezone
import hashlib
import hmac
import os
from pathlib import Path
import secrets
import sqlite3

from app import init_db

DB_PATH = Path(os.environ.get("ZONE_DATA_DIR", Path(__file__).resolve().parent / "data")) / "social.db"


def ensure_db_dir() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)


# Demo account so "Quick Demo Sign In" works with token auth.
DEMO_USERNAME = "John Adhikari"
DEMO_EMAIL = "john@example.com"
DEMO_PASSWORD = "demo1234"


def hash_password(password: str, salt: str) -> str:
    return hmac.new(salt.encode(), password.encode(), hashlib.sha256).hexdigest()


def seed_user(conn) -> None:
    existing = conn.execute(
        "SELECT id FROM users WHERE username = ? OR email = ?",
        (DEMO_USERNAME, DEMO_EMAIL),
    ).fetchone()
    if existing:
        return
    salt = secrets.token_hex(16)
    conn.execute(
        "INSERT INTO users (username, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        (DEMO_USERNAME, DEMO_EMAIL, salt, hash_password(DEMO_PASSWORD, salt), datetime.now(timezone.utc).isoformat()),
    )
    print(f"Created demo account: {DEMO_USERNAME} / {DEMO_PASSWORD}")

SAMPLE_POSTS = [
    {
        "username": "Alex Rivera",
        "text": "Just launched our new AI Agent dashboard built with React 19 & FastAPI! Super clean glassmorphism UI and lightning-fast performance.",
        "picture": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        "category": "AI & Tech",
        "likes": 24,
        "comments": [
            ("Sarah Chen", "Looks incredible! Love the glow effects"),
            ("John Adhikari", "Awesome work team!"),
        ],
    },
    {
        "username": "Emily Taylor",
        "text": "Spent the weekend exploring modern CSS custom properties and responsive grid systems. The web design ecosystem is evolving so fast!",
        "picture": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
        "category": "Design",
        "likes": 42,
        "comments": [("David Kim", "What color palette did you use here?")],
    },
    {
        "username": "Marcus Vance",
        "text": "Backend tip of the day: always validate input on the server, never trust the client. FastAPI + Pydantic makes this a breeze.",
        "picture": None,
        "category": "AI & Tech",
        "likes": 17,
        "comments": [],
    },
    {
        "username": "Elena Rostova",
        "text": "Morning run along the river before the sprint planning. Grateful for these quiet moments. 🌅",
        "picture": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        "category": "Life",
        "likes": 31,
        "comments": [("Sarah Chen", "So peaceful!")],
    },
]


def seed() -> None:
    ensure_db_dir()
    init_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        seed_user(conn)
        count = conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
        if count > 0:
            conn.commit()
            print(f"Database already has {count} posts — skipping seed.")
            return
        now = datetime.now(timezone.utc).isoformat()
        for p in SAMPLE_POSTS:
            cur = conn.execute(
                "INSERT INTO posts (username, text, picture, category, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (p["username"], p["text"], p["picture"], p["category"], p["likes"], now),
            )
            post_id = cur.lastrowid
            for author, text in p["comments"]:
                conn.execute(
                    "INSERT INTO comments (post_id, username, text, created_at) VALUES (?, ?, ?, ?)",
                    (post_id, author, text, now),
                )
        conn.commit()
        print(f"Seeded {len(SAMPLE_POSTS)} posts.")
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
