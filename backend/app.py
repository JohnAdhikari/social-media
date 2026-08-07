"""FastAPI backend for Zone Media Social Network."""

from __future__ import annotations

import bcrypt
import hashlib
import hmac
import json
import os
import secrets
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import psycopg2
import psycopg2.errors
from psycopg2.extras import RealDictCursor

from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Zone Media API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_origin_regex=r"(?i)^https://johnadhikari\.github\.io$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# WebSocket connection manager (in-memory, per-process)
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self) -> None:
        self.active: dict[str, WebSocket] = {}
        self._lock = threading.Lock()

    async def connect(self, username: str, ws: WebSocket) -> None:
        await ws.accept()
        was_online = self.is_online(username)
        with self._lock:
            # One connection per user; drop the old one if present
            self.active[username] = ws
        return not was_online

    def disconnect(self, username: str) -> None:
        with self._lock:
            self.active.pop(username, None)

    def is_online(self, username: str) -> bool:
        with self._lock:
            return username in self.active

    def online_users(self) -> List[str]:
        with self._lock:
            return list(self.active.keys())

    async def notify(self, username: str, event: dict) -> None:
        with self._lock:
            ws = self.active.get(username)
        if ws is not None:
            try:
                await ws.send_json(event)
            except Exception:
                self.disconnect(username)

    async def broadcast(self, event: dict) -> None:
        with self._lock:
            targets = list(self.active.values())
        for ws in targets:
            try:
                await ws.send_json(event)
            except Exception:
                pass


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = "") -> None:
    if not token:
        await ws.close(code=4001, reason="Missing token")
        return
    # Verify token against sessions table
    with connect() as conn:
        row = conn.execute(
            "SELECT username FROM sessions WHERE token = %s AND expires_at > %s",
            (token, now_iso()),
        ).fetchone()
    if not row:
        await ws.close(code=4001, reason="Invalid or expired token")
        return
    username = row["username"]
    await manager.connect(username, ws)
    await manager.broadcast({"type": "presence", "usernames": manager.online_users()})
    try:
        while True:
            raw = await ws.receive_text()
            if not raw:
                continue
            try:
                data = json.loads(raw)
            except Exception:
                continue
            etype = data.get("type")
            if etype == "typing":
                target = data.get("to")
                if target:
                    await manager.notify(target, {
                        "type": "typing",
                        "from": username,
                        "to": target,
                        "typing": bool(data.get("active", True)),
                    })
            elif etype == "read":
                target = data.get("to")
                if target:
                    await manager.notify(target, {
                        "type": "read",
                        "from": username,
                        "to": target,
                    })
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(username)
        await manager.broadcast({"type": "presence", "usernames": manager.online_users()})


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=30, pattern=r'^[a-zA-Z0-9_ ]+$')
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)

class LoginRequest(BaseModel):
    username_or_email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)

class PostCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    picture: Optional[str] = Field(default=None, max_length=2048)
    category: str = Field(default="General", max_length=50)

class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)

class FriendRequestCreate(BaseModel):
    to_user: str = Field(min_length=1, max_length=30)

class FriendRespond(BaseModel):
    from_user: str = Field(min_length=1, max_length=30)
    accept: bool

class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)

class ProfileUpdate(BaseModel):
    bio: Optional[str] = Field(default=None, max_length=200)
    avatar: Optional[str] = Field(default=None, max_length=1200000)
    cover: Optional[str] = Field(default=None, max_length=1200000)


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def connect():
    """Open a Postgres connection with a sqlite3-like .execute() interface."""
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL is not set - configure it in the Render env vars")
    return PgConnection(url)


class PgConnection:
    """Thin wrapper around psycopg2 that mirrors sqlite3.Connection's API."""

    def __init__(self, dsn: str):
        self._conn = psycopg2.connect(dsn, cursor_factory=RealDictCursor)

    def execute(self, sql: str, params=None):
        cur = self._conn.cursor()
        cur.execute(sql, params or ())
        return cur

    def executescript(self, script: str) -> None:
        cur = self._conn.cursor()
        for stmt in script.split(";"):
            stmt = stmt.strip()
            if stmt:
                cur.execute(stmt)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self._conn.rollback()
        else:
            self._conn.commit()
        self._conn.close()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: str) -> str:
    """Hash password with bcrypt. The salt param is kept for interface compat but bcrypt generates its own."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str, salt: str = "") -> bool:
    """Verify password. Supports bcrypt hashes (new accounts) and the legacy
    HMAC-SHA256 hashes (accounts created before the bcrypt migration)."""
    if hashed.startswith("$2"):
        try:
            return bcrypt.checkpw(password.encode(), hashed.encode())
        except Exception:
            return False
    # Legacy HMAC-SHA256 verification
    if not salt:
        return False
    legacy = hmac.new(salt.encode(), password.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(legacy, hashed)


def issue_token() -> str:
    return secrets.token_hex(24)


def get_author(authorization: Optional[str] = Header(default=None)) -> str:
    """Resolve the authenticated user from a Bearer token."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    with connect() as conn:
        row = conn.execute(
            "SELECT username FROM sessions WHERE token = %s AND expires_at > %s",
            (token, now_iso()),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return row["username"]


def _issue_session(conn, username: str) -> str:
    token = issue_token()
    expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    conn.execute(
        "INSERT INTO sessions (token, username, created_at, expires_at) VALUES (%s, %s, %s, %s)",
        (token, username, now_iso(), expires),
    )
    return token


def _notify_db(conn, username: str, ntype: str, actor: str, post_id: Optional[int] = None, text: Optional[str] = None) -> None:
    conn.execute(
        "INSERT INTO notifications (username, type, actor, post_id, text, read, created_at) "
        " VALUES (%s, %s, %s, %s, %s, 0, %s)",
        (username, ntype, actor, post_id, text, now_iso()),
    )


def init_db() -> None:
    with connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                bio TEXT DEFAULT '',
                avatar TEXT,
                cover TEXT,
                created_at TEXT NOT NULL
            );

            ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS cover TEXT;

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                text TEXT NOT NULL,
                picture TEXT,
                category TEXT DEFAULT 'General',
                likes INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                post_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS friend_requests (
                id SERIAL PRIMARY KEY,
                from_user TEXT NOT NULL,
                to_user TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                UNIQUE (from_user, to_user)
            );

            CREATE TABLE IF NOT EXISTS friends (
                id SERIAL PRIMARY KEY,
                user_a TEXT NOT NULL,
                user_b TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE (user_a, user_b)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                from_user TEXT NOT NULL,
                to_user TEXT NOT NULL,
                text TEXT NOT NULL,
                read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                type TEXT NOT NULL,
                actor TEXT NOT NULL,
                post_id INTEGER,
                text TEXT,
                read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS message_requests (
                id SERIAL PRIMARY KEY,
                from_user TEXT NOT NULL,
                to_user TEXT NOT NULL,
                text TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL
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
        "bio": row["bio"],
        "avatar": row["avatar"],
        "cover": row["cover"],
        "created_at": row["created_at"],
    }


@app.post("/api/register", status_code=201)
def register(payload: RegisterRequest) -> dict:
    username = payload.username.strip()
    email = payload.email.strip().lower()
    if not username or not email or not payload.password:
        raise HTTPException(status_code=400, detail="All fields are required")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    salt = secrets.token_hex(16)
    with connect() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO users (username, email, password_salt, password_hash, created_at) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (username, email, salt, hash_password(payload.password, salt), now_iso()),
            )
            new_id = cursor.fetchone()["id"]
            token = _issue_session(conn, username)
            conn.commit()
        except psycopg2.errors.UniqueViolation:
            raise HTTPException(status_code=409, detail="Username or email already exists")
        row = conn.execute("SELECT * FROM users WHERE id = %s", (new_id,)).fetchone()
    result = _public_user(row)
    result["token"] = token
    return result


@app.post("/api/login")
def login(payload: LoginRequest) -> dict:
    key = payload.username_or_email.strip()
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = %s OR email = %s",
            (key, key.lower()),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not verify_password(payload.password, row["password_hash"], row["password_salt"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    with connect() as conn:
        token = _issue_session(conn, row["username"])
        conn.commit()
    result = _public_user(row)
    result["token"] = token
    return result


@app.post("/api/logout")
def logout(author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        conn.execute(
            "DELETE FROM sessions WHERE username = %s",
            (author,),
        )
        conn.commit()
    return {"status": "success"}


@app.get("/api/me")
def me(author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = %s", (author,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    user = _public_user(row)
    user["post_count"] = _post_count(conn, author)
    user["friend_count"] = len(_friend_names(conn, author))
    return user


@app.put("/api/me")
def update_profile(payload: ProfileUpdate, author: str = Depends(get_author)) -> dict:
    sets = []
    params = []
    if payload.bio is not None:
        sets.append("bio = %s")
        params.append(payload.bio.strip()[:200])
    if payload.avatar is not None:
        sets.append("avatar = %s")
        params.append(payload.avatar)
    if payload.cover is not None:
        sets.append("cover = %s")
        params.append(payload.cover)
    if not sets:
        raise HTTPException(status_code=400, detail="Nothing to update")
    params.append(author)
    with connect() as conn:
        conn.execute(f"UPDATE users SET {', '.join(sets)} WHERE username = %s", params)
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE username = %s", (author,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        user = _public_user(row)
        user["post_count"] = _post_count(conn, author)
        user["friend_count"] = len(_friend_names(conn, author))
    return user


# ---------------------------------------------------------------------------
# Online presence
# ---------------------------------------------------------------------------

@app.get("/api/online")
def online(author: str = Depends(get_author)) -> dict:
    return {"usernames": manager.online_users()}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def _serialize_notification(row) -> dict:
    return {
        "id": row["id"],
        "type": row["type"],
        "actor": row["actor"],
        "post_id": row["post_id"],
        "text": row["text"],
        "read": bool(row["read"]),
        "created_at": row["created_at"],
    }


@app.get("/api/notifications")
def get_notifications(author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM notifications WHERE username = %s ORDER BY id DESC LIMIT 50",
            (author,),
        ).fetchall()
        unread = conn.execute(
            "SELECT COUNT(*) AS c FROM notifications WHERE username = %s AND read = 0",
            (author,),
        ).fetchone()
    return {
        "items": [_serialize_notification(r) for r in rows],
        "unread": unread["c"] if unread else 0,
    }


@app.post("/api/notifications/read")
def mark_notifications_read(author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        conn.execute("UPDATE notifications SET read = 1 WHERE username = %s", (author,))
        conn.commit()
    return {"status": "success"}


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def _escape_like(s: str) -> str:
    """Escape LIKE wildcards for Postgres."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@app.get("/api/users/search")
def search_users(q: str = "", author: str = Depends(get_author)) -> List[dict]:
    with connect() as conn:
        if q.strip():
            escaped = _escape_like(q.strip())
            like = f"%{escaped}%"
            rows = conn.execute(
                "SELECT * FROM users WHERE username LIKE %s ESCAPE '\\' OR email LIKE %s ESCAPE '\\' ORDER BY username LIMIT 20",
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
            result.append({
                "username": name,
                "bio": r["bio"],
                "avatar": r["avatar"],
                "post_count": _post_count(conn, name),
                "status": status,
            })
        return result


@app.get("/api/users/suggest")
def suggest_friends(author: str = Depends(get_author)) -> List[dict]:
    with connect() as conn:
        friends = set(_friend_names(conn, author))
        pending_in = set(_incoming_requests(conn, author))
        pending_out = set(_sent_requests(conn, author))
        rows = conn.execute(
            "SELECT * FROM users WHERE username != %s ORDER BY created_at DESC LIMIT 30",
            (author,),
        ).fetchall()
        result = []
        for r in rows:
            name = r["username"]
            if name in friends or name in pending_in or name in pending_out:
                continue
            result.append({
                "username": name,
                "email": r["email"],
                "bio": r["bio"],
                "avatar": r["avatar"],
                "post_count": _post_count(conn, name),
            })
            if len(result) >= 5:
                break
        return result


@app.get("/api/users/{username}")
def get_user(username: str, author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = %s", (username,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        user = _public_user(row)
        if author == username:
            user["email"] = row["email"]
        user["post_count"] = _post_count(conn, username)
        user["friend_count"] = len(_friend_names(conn, username))
        return user


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------

def _serialize_post(row, conn) -> dict:
    comments = conn.execute(
        "SELECT * FROM comments WHERE post_id = %s ORDER BY id ASC", (row["id"],)
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


@app.get("/api/users/{username}/posts")
def get_user_posts(username: str) -> List[dict]:
    with connect() as conn:
        posts = conn.execute(
            "SELECT * FROM posts WHERE username = %s ORDER BY id DESC", (username,)
        ).fetchall()
        return [_serialize_post(p, conn) for p in posts]


@app.post("/api/posts", status_code=201)
def create_post(payload: PostCreate, author: str = Depends(get_author)) -> dict:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Post text cannot be empty")
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO posts (username, text, picture, category, likes, created_at) VALUES (%s, %s, %s, %s, 0, %s) RETURNING id",
            (author, payload.text.strip(), payload.picture, payload.category, now_iso()),
        )
        post_id = cursor.fetchone()["id"]
        conn.commit()
        row = conn.execute("SELECT * FROM posts WHERE id = %s", (post_id,)).fetchone()
        return _serialize_post(row, conn)


@app.delete("/api/posts/{post_id}", status_code=200)
def delete_post(post_id: int, author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM posts WHERE id = %s", (post_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        if row["username"] != author:
            raise HTTPException(status_code=403, detail="You can only delete your own posts")
        conn.execute("DELETE FROM posts WHERE id = %s", (post_id,))
        conn.commit()
    return {"status": "success", "id": post_id}


@app.post("/api/posts/{post_id}/like")
async def like_post(post_id: int, author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM posts WHERE id = %s", (post_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        conn.execute("UPDATE posts SET likes = likes + 1 WHERE id = %s", (post_id,))
        if row["username"] != author:
            _notify_db(conn, row["username"], "like", author, post_id=post_id)
        conn.commit()
        post_owner = row["username"]
        updated = conn.execute("SELECT likes FROM posts WHERE id = %s", (post_id,)).fetchone()
    if post_owner != author:
        await manager.notify(post_owner, {"type": "like", "actor": author, "post_id": post_id})
    return {"status": "success", "id": post_id, "likes": updated["likes"]}


@app.post("/api/posts/{post_id}/comments", status_code=201)
async def add_comment(post_id: int, payload: CommentCreate, author: str = Depends(get_author)) -> dict:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    with connect() as conn:
        row = conn.execute("SELECT * FROM posts WHERE id = %s", (post_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        cursor = conn.execute(
            "INSERT INTO comments (post_id, username, text, created_at) VALUES (%s, %s, %s, %s) RETURNING id",
            (post_id, author, payload.text.strip(), now_iso()),
        )
        comment_id = cursor.fetchone()["id"]
        if row["username"] != author:
            _notify_db(conn, row["username"], "comment", author, post_id=post_id, text=payload.text.strip())
        conn.commit()
        comment = conn.execute("SELECT * FROM comments WHERE id = %s", (comment_id,)).fetchone()
        post_owner = row["username"]
    if post_owner != author:
        await manager.notify(post_owner, {"type": "comment", "actor": author, "post_id": post_id})
    return dict(comment)


# ---------------------------------------------------------------------------
# Friends
# ---------------------------------------------------------------------------

def _post_count(conn, username: str) -> int:
    row = conn.execute("SELECT COUNT(*) AS c FROM posts WHERE username = %s", (username,)).fetchone()
    return row["c"] if row else 0


def _friend_names(conn, username: str) -> List[str]:
    rows = conn.execute(
        "SELECT user_a, user_b FROM friends WHERE user_a = %s OR user_b = %s",
        (username, username),
    ).fetchall()
    names = set()
    for r in rows:
        names.add(r["user_a"] if r["user_b"] == username else r["user_b"])
    return sorted(names)


def _incoming_requests(conn, username: str) -> List[str]:
    rows = conn.execute(
        "SELECT from_user FROM friend_requests WHERE to_user = %s AND status = 'pending'",
        (username,),
    ).fetchall()
    return [r["from_user"] for r in rows]


def _sent_requests(conn, username: str) -> List[str]:
    rows = conn.execute(
        "SELECT to_user FROM friend_requests WHERE from_user = %s AND status = 'pending'",
        (username,),
    ).fetchall()
    return [r["to_user"] for r in rows]


@app.get("/api/friends")
def get_friends(author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        friend_names = _friend_names(conn, author)
        friends = []
        for name in friend_names:
            frow = conn.execute("SELECT avatar FROM users WHERE username = %s", (name,)).fetchone()
            friends.append({
                "username": name,
                "avatar": frow["avatar"] if frow else None,
                "post_count": _post_count(conn, name),
            })
        return {
            "friends": friends,
            "pending_incoming": _incoming_requests(conn, author),
            "pending_sent": _sent_requests(conn, author),
            "stats": {
                "friend_count": len(friend_names),
                "request_count": len(_incoming_requests(conn, author)),
                "post_count": _post_count(conn, author),
            },
        }


@app.post("/api/friends/request", status_code=201)
async def send_friend_request(payload: FriendRequestCreate, author: str = Depends(get_author)) -> dict:
    to_user = payload.to_user.strip()
    if to_user == author:
        raise HTTPException(status_code=400, detail="You cannot friend yourself")
    with connect() as conn:
        # Are they already friends?
        friend_rows = conn.execute(
            "SELECT id FROM friends WHERE (user_a = %s AND user_b = %s) OR (user_a = %s AND user_b = %s)",
            (author, to_user, to_user, author),
        ).fetchall()
        if friend_rows:
            raise HTTPException(status_code=409, detail="Already friends")
        # Existing pending request either direction?
        dup = conn.execute(
            "SELECT id FROM friend_requests WHERE "
            "(from_user = %s AND to_user = %s) OR (from_user = %s AND to_user = %s)",
            (author, to_user, to_user, author),
        ).fetchall()
        if dup:
            raise HTTPException(status_code=409, detail="Friend request already pending")
        # Target must be a real user
        target = conn.execute("SELECT id FROM users WHERE username = %s", (to_user,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        conn.execute(
            "INSERT INTO friend_requests (from_user, to_user, status, created_at) VALUES (%s, %s, 'pending', %s)",
            (author, to_user, now_iso()),
        )
        _notify_db(conn, to_user, "friend_request", author)
        conn.commit()
    await manager.notify(to_user, {"type": "friend_request", "actor": author})
    return {"status": "success", "from_user": author, "to_user": to_user}


@app.post("/api/friends/respond")
async def respond_friend_request(payload: FriendRespond, author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM friend_requests WHERE from_user = %s AND to_user = %s AND status = 'pending'",
            (payload.from_user, author),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Request not found")
        if payload.accept:
            conn.execute(
                "INSERT INTO friends (user_a, user_b, created_at) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (min(payload.from_user, author), max(payload.from_user, author), now_iso()),
            )
            conn.execute(
                "UPDATE friend_requests SET status = 'accepted' WHERE id = %s", (row["id"],)
            )
            _notify_db(conn, payload.from_user, "friend_accept", author)
            conn.commit()
            # Mark the recipient's friend_request notification as read and update it
            conn.execute(
                "UPDATE notifications SET read = 1, type = 'friend_accept', text = %s WHERE username = %s AND type = 'friend_request' AND actor = %s",
                (f"You are now friends with {author}", author, payload.from_user),
            )
            conn.commit()
        else:
            conn.execute("DELETE FROM friend_requests WHERE id = %s", (row["id"],))
            conn.commit()
    if payload.accept:
        await manager.notify(payload.from_user, {"type": "friend_accept", "actor": author})
    return {"status": "success", "accepted": payload.accept}


@app.post("/api/friends/remove")
def remove_friend(payload: FriendRequestCreate, author: str = Depends(get_author)) -> dict:
    other = payload.to_user.strip()
    with connect() as conn:
        conn.execute(
            "DELETE FROM friends WHERE (user_a = %s AND user_b = %s) OR (user_a = %s AND user_b = %s)",
            (author, other, other, author),
        )
        conn.execute(
            "DELETE FROM friend_requests WHERE (from_user = %s AND to_user = %s) OR (from_user = %s AND to_user = %s)",
            (author, other, other, author),
        )
        conn.commit()
    return {"status": "success", "removed": other}


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

def _serialize_message(row) -> dict:
    return {
        "id": row["id"],
        "from_user": row["from_user"],
        "to_user": row["to_user"],
        "text": row["text"],
        "read": bool(row["read"]),
        "created_at": row["created_at"],
    }


@app.get("/api/conversations")
def get_conversations(author: str = Depends(get_author)) -> List[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE from_user = %s OR to_user = %s ORDER BY id ASC",
            (author, author),
        ).fetchall()
        threads = {}
        for r in rows:
            other = r["from_user"] if r["to_user"] == author else r["to_user"]
            if other not in threads:
                threads[other] = []
            threads[other].append(r)
        result = []
        for other, msgs in threads.items():
            last = msgs[-1]
            unread = sum(1 for m in msgs if m["to_user"] == author and not m["read"])
            is_friend = bool(
                conn.execute(
                    "SELECT id FROM friends WHERE (user_a = %s AND user_b = %s) OR (user_a = %s AND user_b = %s)",
                    (author, other, other, author),
                ).fetchone()
            )
            other_row = conn.execute("SELECT avatar FROM users WHERE username = %s", (other,)).fetchone()
            result.append({
                "username": other,
                "avatar": other_row["avatar"] if other_row else None,
                "is_friend": is_friend,
                "last_message": last["text"],
                "last_time": last["created_at"],
                "unread": unread,
            })
        result.sort(key=lambda t: t["last_time"], reverse=True)
        return result


@app.get("/api/messages/{other_user}")
async def get_thread(other_user: str, author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        # Mark messages to author as read
        conn.execute(
            "UPDATE messages SET read = 1 WHERE from_user = %s AND to_user = %s",
            (other_user, author),
        )
        conn.commit()
        rows = conn.execute(
            "SELECT * FROM messages WHERE "
            "(from_user = %s AND to_user = %s) OR (from_user = %s AND to_user = %s) ORDER BY id ASC",
            (author, other_user, other_user, author),
        ).fetchall()
        other = conn.execute("SELECT * FROM users WHERE username = %s", (other_user,)).fetchone()
        other_profile = {
            "username": other["username"] if other else other_user,
            "bio": other["bio"] if other else "",
            "avatar": other["avatar"] if other else None,
            "cover": other["cover"] if other else None,
            "post_count": _post_count(conn, other_user) if other else 0,
        }
    # Let the sender know their messages were read
    await manager.notify(other_user, {"type": "read", "from": author, "to": other_user})
    return {"other": other_profile, "messages": [_serialize_message(r) for r in rows]}


@app.post("/api/messages/{other_user}", status_code=201)
async def send_message(other_user: str, payload: MessageCreate, author: str = Depends(get_author)) -> dict:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    with connect() as conn:
        target = conn.execute("SELECT id FROM users WHERE username = %s", (other_user,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        # Check if they are friends
        is_friend = conn.execute(
            "SELECT id FROM friends WHERE (user_a = %s AND user_b = %s) OR (user_a = %s AND user_b = %s)",
            (author, other_user, other_user, author),
        ).fetchone()

        if is_friend:
            # Direct message (existing behavior)
            cursor = conn.execute(
                "INSERT INTO messages (from_user, to_user, text, read, created_at) VALUES (%s, %s, %s, 0, %s) RETURNING id",
                (author, other_user, payload.text.strip(), now_iso()),
            )
            msg_id = cursor.fetchone()["id"]
            conn.commit()
            row = conn.execute("SELECT * FROM messages WHERE id = %s", (msg_id,)).fetchone()
        else:
            # Non-friend: store as message request
            cursor = conn.execute(
                "INSERT INTO message_requests (from_user, to_user, text, status, created_at) VALUES (%s, %s, %s, 'pending', %s) RETURNING id",
                (author, other_user, payload.text.strip(), now_iso()),
            )
            req_id = cursor.fetchone()["id"]
            conn.commit()
            # Return a pseudo-message response
            return {
                "id": req_id,
                "from_user": author,
                "to_user": other_user,
                "text": payload.text.strip(),
                "read": False,
                "created_at": now_iso(),
                "message_request": True,
            }
    message = _serialize_message(row)
    # Push the new message to the recipient's live socket if connected
    await manager.notify(other_user, {"type": "message", "message": message})
    return message


# ---------------------------------------------------------------------------
# Message requests (non-friend messaging)
# ---------------------------------------------------------------------------

@app.get("/api/message-requests")
def get_message_requests(author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM message_requests WHERE to_user = %s AND status = 'pending' ORDER BY id ASC",
            (author,),
        ).fetchall()
        # Group by sender
        grouped = {}
        for r in rows:
            sender = r["from_user"]
            if sender not in grouped:
                grouped[sender] = []
            grouped[sender].append({
                "id": r["id"],
                "text": r["text"],
                "created_at": r["created_at"],
            })
        result = []
        for k, v in grouped.items():
            arow = conn.execute("SELECT avatar FROM users WHERE username = %s", (k,)).fetchone()
            result.append({"from_user": k, "avatar": arow["avatar"] if arow else None, "messages": v})
        return {"requests": result}


@app.post("/api/message-requests/{request_id}/accept", status_code=200)
async def accept_message_request(request_id: int, author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM message_requests WHERE id = %s AND to_user = %s AND status = 'pending'",
            (request_id, author),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Request not found")
        sender = row["from_user"]
        # Migrate all pending messages from this sender to messages table
        pending = conn.execute(
            "SELECT * FROM message_requests WHERE from_user = %s AND to_user = %s AND status = 'pending'",
            (sender, author),
        ).fetchall()
        for msg in pending:
            conn.execute(
                "INSERT INTO messages (from_user, to_user, text, read, created_at) VALUES (%s, %s, %s, 1, %s)",
                (sender, author, msg["text"], msg["created_at"]),
            )
        conn.execute(
            "UPDATE message_requests SET status = 'accepted' WHERE from_user = %s AND to_user = %s AND status = 'pending'",
            (sender, author),
        )
        conn.commit()
    return {"status": "success", "from_user": sender}


@app.post("/api/message-requests/{request_id}/decline", status_code=200)
async def decline_message_request(request_id: int, author: str = Depends(get_author)) -> dict:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM message_requests WHERE id = %s AND to_user = %s AND status = 'pending'",
            (request_id, author),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Request not found")
        sender = row["from_user"]
        conn.execute(
            "DELETE FROM message_requests WHERE from_user = %s AND to_user = %s AND status = 'pending'",
            (sender, author),
        )
        conn.commit()
    return {"status": "success", "from_user": sender}