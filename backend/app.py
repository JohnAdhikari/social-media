"""FastAPI backend for Zone Media Social Network."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "social.db"

app = FastAPI(title="Zone Media API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class PostCreate(BaseModel):
    text: str
    picture: Optional[str] = None
    category: str = "General"

class CommentCreate(BaseModel):
    text: str

class FriendRequestCreate(BaseModel):
    to_user: str

class FriendRespond(BaseModel):
    from_user: str
    accept: bool


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: str) -> str:
    return hmac.new(salt.encode(), password.encode(), hashlib.sha256).hexdigest()


def get_author(author: Optional[str] = Header(default=None)) -> str:
    return (author or "Guest").strip() or "Guest"


def init_db() -> None:
    with connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                bio TEXT DEFAULT 'Welcome to my Zone Media profile!',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                text TEXT NOT NULL,
                picture TEXT,
                category TEXT DEFAULT 'General',
                likes INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS friend_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_user TEXT NOT NULL,
                to_user TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                UNIQUE (from_user, to_user)
            );

            CREATE TABLE IF NOT EXISTS friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_a TEXT NOT NULL,
                user_b TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE (user_a, user_b)
            );
        """)
        conn.commit()


@app.on_event("startup")
def startup() -> None:
    init_db()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def _public_user(row) -> dict:
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "bio": row["bio"],
        "created_at": row["created_at"],
    }


@app.post("/api/register", status_code=201)
def register(payload: RegisterRequest) -> dict:
    username = payload.username.strip()
    email = payload.email.strip().lower()
    if not username or not email or not payload.password:
        raise HTTPException(status_code=400, detail="All fields are required")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    salt = secrets.token_hex(16)
    with connect() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO users (username, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (username, email, salt, hash_password(payload.password, salt), now_iso()),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Username or email already exists")
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _public_user(row)


@app.post("/api/login")
def login(payload: LoginRequest) -> dict:
    key = payload.username_or_email.strip()
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            (key, key.lower()),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not hmac.compare_digest(hash_password(payload.password, row["password_salt"]), row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return _public_user(row)


@app.get("/api/users/search")
def search_users(q: str = "", author: str = Depends(get_author)) -> List[dict]:
    with connect() as conn:
        if q.strip():
            like = f"%{q.strip()}%"
            rows = conn.execute(
                "SELECT * FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY username LIMIT 20",
                (like, like),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM users ORDER BY username LIMIT 20").fetchall()
        friends = _friend_names(conn, author)
        pending_in = set(_incoming_requests(conn, author))
        pending_out = set(_sent_requests(conn, author))
        result = []
        for r in rows:
            name = r["username"]
            if name == author:
                continue
            status = "friends" if name in friends else (
                "incoming" if name in pending_in else (
                    "outgoing" if name in pending_out else "none"
                )
            )
            result.append({"username": name, "email": r["email"], "bio": r["bio"], "status": status})
        return result


@app.get("/api/users/{username}")
def get_user(username: str) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return _public_user(row)


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------

def _serialize_post(row, conn) -> dict:
    comments = conn.execute(
        "SELECT * FROM comments WHERE post_id = ? ORDER BY id ASC", (row["id"],)
    ).fetchall()
    return {
        "id": row["id"],
        "username": row["username"],
        "text": row["text"],
        "picture": row["picture"],
        "category": row["category"],
        "likes": row["likes"],
        "created_at": row["created_at"],
        "comments": [dict(c) for c in comments],
    }


@app.get("/api/posts")
def get_posts() -> List[dict]:
    with connect() as conn:
        posts = conn.execute("SELECT * FROM posts ORDER BY id DESC").fetchall()
        return [_serialize_post(p, conn) for p in posts]


@app.post("/api/posts", status_code=201)
def create_post(payload: PostCreate, author: str = Depends(get_author)) -> dict:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Post text cannot be empty")
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO posts (username, text, picture, category, likes, created_at) VALUES (?, ?, ?, ?, 0, ?)",
            (author, payload.text.strip(), payload.picture, payload.category, now_iso()),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM posts WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return _serialize_post(row, conn)


@app.delete("/api/posts/{post_id}", status_code=200)
def delete_post(post_id: int, author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        if row["username"] != author:
            raise HTTPException(status_code=403, detail="You can only delete your own posts")
        conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        conn.commit()
    return {"status": "success", "id": post_id}


@app.post("/api/posts/{post_id}/like")
def like_post(post_id: int) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        conn.execute("UPDATE posts SET likes = likes + 1 WHERE id = ?", (post_id,))
        conn.commit()
        updated = conn.execute("SELECT likes FROM posts WHERE id = ?", (post_id,)).fetchone()
    return {"status": "success", "id": post_id, "likes": updated["likes"]}


@app.post("/api/posts/{post_id}/comments", status_code=201)
def add_comment(post_id: int, payload: CommentCreate, author: str = Depends(get_author)) -> dict:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    with connect() as conn:
        row = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        cursor = conn.execute(
            "INSERT INTO comments (post_id, username, text, created_at) VALUES (?, ?, ?, ?)",
            (post_id, author, payload.text.strip(), now_iso()),
        )
        conn.commit()
        comment = conn.execute("SELECT * FROM comments WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(comment)


# ---------------------------------------------------------------------------
# Friends
# ---------------------------------------------------------------------------

def _friend_names(conn, username: str) -> List[str]:
    rows = conn.execute(
        "SELECT user_a, user_b FROM friends WHERE user_a = ? OR user_b = ?",
        (username, username),
    ).fetchall()
    names = set()
    for r in rows:
        names.add(r["user_a"] if r["user_b"] == username else r["user_b"])
    return sorted(names)


def _incoming_requests(conn, username: str) -> List[str]:
    rows = conn.execute(
        "SELECT from_user FROM friend_requests WHERE to_user = ? AND status = 'pending'",
        (username,),
    ).fetchall()
    return [r["from_user"] for r in rows]


def _sent_requests(conn, username: str) -> List[str]:
    rows = conn.execute(
        "SELECT to_user FROM friend_requests WHERE from_user = ? AND status = 'pending'",
        (username,),
    ).fetchall()
    return [r["to_user"] for r in rows]


@app.get("/api/friends")
def get_friends(author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        return {
            "friends": _friend_names(conn, author),
            "pending_incoming": _incoming_requests(conn, author),
            "pending_sent": _sent_requests(conn, author),
        }


@app.post("/api/friends/request", status_code=201)
def send_friend_request(payload: FriendRequestCreate, author: str = Depends(get_author)) -> dict:
    to_user = payload.to_user.strip()
    if to_user == author:
        raise HTTPException(status_code=400, detail="You cannot friend yourself")
    with connect() as conn:
        # Are they already friends?
        friend_rows = conn.execute(
            "SELECT id FROM friends WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)",
            (author, to_user, to_user, author),
        ).fetchall()
        if friend_rows:
            raise HTTPException(status_code=409, detail="Already friends")
        # Existing pending request either direction?
        dup = conn.execute(
            "SELECT id FROM friend_requests WHERE "
            "(from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?)",
            (author, to_user, to_user, author),
        ).fetchall()
        if dup:
            raise HTTPException(status_code=409, detail="Friend request already pending")
        # Target must be a real user
        target = conn.execute("SELECT id FROM users WHERE username = ?", (to_user,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        conn.execute(
            "INSERT INTO friend_requests (from_user, to_user, status, created_at) VALUES (?, ?, 'pending', ?)",
            (author, to_user, now_iso()),
        )
        conn.commit()
    return {"status": "success", "from_user": author, "to_user": to_user}


@app.post("/api/friends/respond")
def respond_friend_request(payload: FriendRespond, author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM friend_requests WHERE from_user = ? AND to_user = ? AND status = 'pending'",
            (payload.from_user, author),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Request not found")
        if payload.accept:
            conn.execute(
                "INSERT OR IGNORE INTO friends (user_a, user_b, created_at) VALUES (?, ?, ?)",
                (min(payload.from_user, author), max(payload.from_user, author), now_iso()),
            )
            conn.execute(
                "UPDATE friend_requests SET status = 'accepted' WHERE id = ?", (row["id"],)
            )
        else:
            conn.execute("DELETE FROM friend_requests WHERE id = ?", (row["id"],))
        conn.commit()
    return {"status": "success", "accepted": payload.accept}


@app.post("/api/friends/remove")
def remove_friend(payload: FriendRequestCreate, author: str = Depends(get_author)) -> dict:
    other = payload.to_user.strip()
    with connect() as conn:
        conn.execute(
            "DELETE FROM friends WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)",
            (author, other, other, author),
        )
        conn.execute(
            "DELETE FROM friend_requests WHERE (from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?)",
            (author, other, other, author),
        )
        conn.commit()
    return {"status": "success", "removed": other}
