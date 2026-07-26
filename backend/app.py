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

def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
        """)
        conn.commit()

@app.on_event("startup")
def startup() -> None:
    init_db()

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/api/posts")
def get_posts() -> List[dict]:
    with connect() as conn:
        posts = conn.execute("SELECT * FROM posts ORDER BY id DESC").fetchall()
        result = []
        for p in posts:
            post_dict = dict(p)
            comments = conn.execute("SELECT * FROM comments WHERE post_id = ? ORDER BY id ASC", (p["id"],)).fetchall()
            post_dict["comments"] = [dict(c) for c in comments]
            result.append(post_dict)
        return result

@app.post("/api/posts")
def create_post(payload: PostCreate, author: str = "Guest") -> dict:
    created_at = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO posts (username, text, picture, category, likes, created_at) VALUES (?, ?, ?, ?, 0, ?)",
            (author, payload.text, payload.picture, payload.category, created_at)
        )
        conn.commit()
        post_id = cursor.lastrowid
    return {"id": post_id, "username": author, **payload.model_dump(), "likes": 0, "comments": [], "timestamp": "Just now"}

@app.post("/api/posts/{post_id}/like")
def like_post(post_id: int) -> dict:
    with connect() as conn:
        conn.execute("UPDATE posts SET likes = likes + 1 WHERE id = ?", (post_id,))
        conn.commit()
    return {"status": "success"}

@app.post("/api/posts/{post_id}/comments")
def add_comment(post_id: int, payload: CommentCreate, author: str = "Guest") -> dict:
    created_at = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO comments (post_id, username, text, created_at) VALUES (?, ?, ?, ?)",
            (post_id, author, payload.text, created_at)
        )
        conn.commit()
        comment_id = cursor.lastrowid
    return {"id": comment_id, "post_id": post_id, "username": author, "text": payload.text}
