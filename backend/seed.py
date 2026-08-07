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

# A second account that is already friends with the demo user, so the
# friend list and the messaging system are visible in the demo.
FRIEND_USERNAME = "Demo Friend"
FRIEND_EMAIL = "friend@example.com"
FRIEND_PASSWORD = "demo1234"
FRIEND_BIO = "Your friendly demo contact - say hi!"

# A third account that sends a pending friend request, so the notification
# bell and the accept/decline flow are visible in the demo.
REQUESTER_USERNAME = "Sara Khan"
REQUESTER_EMAIL = "sara@example.com"
REQUESTER_PASSWORD = "demo1234"
REQUESTER_BIO = "New here - looking to connect!"


def hash_password(password: str, salt: str) -> str:
    return hmac.new(salt.encode(), password.encode(), hashlib.sha256).hexdigest()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
        (DEMO_USERNAME, DEMO_EMAIL, salt, hash_password(DEMO_PASSWORD, salt), now_iso()),
    )
    print(f"Created demo account: {DEMO_USERNAME} / {DEMO_PASSWORD}")


def seed_user_if_missing(conn, username: str, email: str, password: str, bio: str) -> None:
    existing = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if existing:
        return
    salt = secrets.token_hex(16)
    conn.execute(
        "INSERT INTO users (username, email, password_salt, password_hash, bio, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (username, email, salt, hash_password(password, salt), bio, now_iso()),
    )
    print(f"Created account: {username} / {password}")


def seed_friend(conn) -> None:
    seed_user_if_missing(conn, FRIEND_USERNAME, FRIEND_EMAIL, FRIEND_PASSWORD, FRIEND_BIO)
    row = conn.execute(
        "SELECT id FROM friends WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)",
        (DEMO_USERNAME, FRIEND_USERNAME, FRIEND_USERNAME, DEMO_USERNAME),
    ).fetchone()
    if row:
        return
    conn.execute(
        "INSERT INTO friends (user_a, user_b, created_at) VALUES (?, ?, ?)",
        (min(DEMO_USERNAME, FRIEND_USERNAME), max(DEMO_USERNAME, FRIEND_USERNAME), now_iso()),
    )
    print(f"Connected {DEMO_USERNAME} <-> {FRIEND_USERNAME}")


def seed_pending_request(conn) -> None:
    seed_user_if_missing(conn, REQUESTER_USERNAME, REQUESTER_EMAIL, REQUESTER_PASSWORD, REQUESTER_BIO)
    exists = conn.execute(
        "SELECT id FROM friend_requests WHERE (from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?)",
        (REQUESTER_USERNAME, DEMO_USERNAME, DEMO_USERNAME, REQUESTER_USERNAME),
    ).fetchone()
    if exists:
        return
    conn.execute(
        "INSERT INTO friend_requests (from_user, to_user, status, created_at) VALUES (?, ?, 'pending', ?)",
        (REQUESTER_USERNAME, DEMO_USERNAME, now_iso()),
    )
    conn.execute(
        "INSERT INTO notifications (username, type, actor, text, read, created_at) VALUES (?, ?, ?, ?, 0, ?)",
        (DEMO_USERNAME, "friend_request", REQUESTER_USERNAME, "Sara Khan sent you a friend request", now_iso()),
    )
    print(f"Created pending friend request: {REQUESTER_USERNAME} -> {DEMO_USERNAME}")


SAMPLE_MESSAGES = [
    ("Demo Friend", DEMO_USERNAME, "Hey John! Welcome to Zone Media."),
    (DEMO_USERNAME, "Demo Friend", "Thanks! The real-time chat is slick."),
    ("Demo Friend", DEMO_USERNAME, "Right? And it's all live over WebSockets. Message me any time."),
]


def seed_messages(conn) -> None:
    count = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
    if count > 0:
        return
    for i, (frm, to, text) in enumerate(SAMPLE_MESSAGES):
        conn.execute(
            "INSERT INTO messages (from_user, to_user, text, read, created_at) VALUES (?, ?, ?, ?, ?)",
            (frm, to, text, 1 if i < len(SAMPLE_MESSAGES) - 1 else 0, now_iso()),
        )
    print(f"Seeded {len(SAMPLE_MESSAGES)} demo messages.")

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
    {
        "username": "John Adhikari",
        "text": "Just shipped a real-time social platform — WebSockets for chat, a friend system, and live notifications. Try messaging me!",
        "picture": None,
        "category": "AI & Tech",
        "likes": 18,
        "comments": [("Demo Friend", "Congrats, this is awesome!"), ("Sara Khan", "How long did the backend take?")],
    },
]


def seed() -> None:
    ensure_db_dir()
    init_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        seed_user(conn)
        seed_friend(conn)
        seed_pending_request(conn)
        seed_messages(conn)
        count = conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
        if count > 0:
            conn.commit()
            print(f"Database already has {count} posts — skipping post seed.")
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
