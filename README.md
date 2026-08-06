# Zone Media — Social Media Clone

A full-stack social media clone with signup/login, a live post feed, likes and comments — powered by a React frontend and a FastAPI + SQLite API. Posts, likes, comments and users are stored in a real SQLite database (`backend/data/social.db`).

## Features

- Authentication — register and login flows (hashed passwords)
- Post feed — create, like, comment and delete posts (persisted to SQLite)
- Search + Feed/Explore tabs
- Profile sidebar, contacts panel, navigation bar
- Responsive UI built with React + Tailwind CSS

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, react-router-dom 7, GSAP |
| Backend | FastAPI (`backend/app.py`) |
| Database | SQLite (`backend/data/social.db`) |

## Getting Started

### 1. Backend (API) — port 8000

```bash
cd backend
pip install -r requirements.txt
python seed.py        # optional: seed sample posts
python -m uvicorn app:app --reload --port 8000
```

Endpoints: register, login, users, posts (list/create/delete), like, comments. The database is auto-created on startup.

### 2. Frontend — port 5174

```bash
npm install
npm run dev
```

In development, Vite proxies `/api` to `http://127.0.0.1:8000`, so no CORS setup or base URL config is needed.

### Running both

```bash
# terminal 1 — backend
cd backend && python -m uvicorn app:app --reload --port 8000

# terminal 2 — frontend
npm run dev
```

## Live

**https://JohnAdhikari.github.io/social-media/**

> Note: the live GitHub Pages build is frontend-only (no server), so the live feed uses demo data. Run it locally with the backend for full persistence.
