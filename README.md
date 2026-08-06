# Zone Media — Social Media Clone

A full-stack social media clone with token-based auth, a live post feed, likes/comments, friends, real-time messaging and live notifications — powered by a React frontend and a FastAPI + SQLite API. All data is stored in a real SQLite database (`backend/data/social.db`).

## Features

- **Authentication** — register/login/logout with hashed passwords + **session tokens** (Bearer auth, 30-day expiry). `Quick Demo Sign In` uses a seeded demo account.
- **Post feed** — create, like, comment and delete posts (persisted to SQLite)
- **Friends** — search, friend requests, accept/decline, suggestions
- **Real-time messaging** — WebSockets push messages instantly; typing indicator, online presence dots and **read receipts** (✓ / ✓✓)
- **Live notifications** — friend requests, likes and comments arrive over WebSocket and appear in the navbar bell without refreshing
- **Online presence** — green dots reflect real WebSocket connections, updated live
- Search + Feed/Explore tabs, profile pages, theme toggle (dark/light)
- Responsive UI built with React + Tailwind CSS

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, react-router-dom 7, GSAP |
| Backend | FastAPI (`backend/app.py`) |
| Database | SQLite (`backend/data/social.db`), path overridable via `ZONE_DATA_DIR` |

## Getting Started

### 1. Backend (API) — port 8000

```bash
cd backend
pip install -r requirements.txt
python seed.py        # optional: seed sample posts + demo account
python -m uvicorn app:app --reload --port 8000
```

The database is auto-created on startup (new tables: `sessions`, `notifications`).

### 2. Frontend — port 5173

```bash
npm install
npm run dev
```

In development, Vite proxies `/api` and `/ws` to `http://127.0.0.1:8000`, so no CORS setup or base URL config is needed.

### Running both

```bash
# terminal 1 — backend
cd backend && python -m uvicorn app:app --reload --port 8000

# terminal 2 — frontend
npm run dev
```

## Live

**https://JohnAdhikari.github.io/social-media/**

> The GitHub Pages build is frontend-only. Point it at a hosted backend (see below) for full persistence; otherwise it falls back to same-origin `/api` which needs the backend running locally.

## Deploying the backend (Render — free)

1. Push this repo to GitHub.
2. Go to https://dashboard.render.com → **New** → **Blueprint** → select this repo. Render detects `render-backend.yaml` and provisions `zone-media-api` automatically (free plan, WebSockets supported, 1 GB SQLite disk mounted at `/data`).
3. Wait for the deploy to finish and copy the service URL, e.g. `https://zone-media-api.onrender.com`.
4. Point the frontend at it: edit `public/config.js` and set

   ```js
   window.ZONE_API = "https://zone-media-api.onrender.com";
   window.ZONE_WS  = "wss://zone-media-api.onrender.com";
   ```

5. Rebuild + redeploy the frontend:

   ```bash
   npm run build
   npm run deploy   # publishes dist/ to the gh-pages branch
   ```

Demo account after seeding: **John Adhikari** / `demo1234`.

## API Overview

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/register` | — | Create account, returns token |
| POST | `/api/login` | — | Login, returns token |
| POST | `/api/logout` | token | Invalidate session |
| GET | `/api/me` | token | Current user |
| GET | `/api/online` | token | Usernames with live WS connections |
| GET/POST | `/api/notifications` | token | List / mark-read notifications |
| GET/POST | `/api/posts`, `/api/posts/{id}` | token* | Feed CRUD |
| POST | `/api/posts/{id}/like`, `/api/posts/{id}/comments` | token | Likes + comments (push notifications) |
| GET/POST | `/api/friends`, `/api/friends/request`, `/api/friends/respond` | token | Friend system |
| GET/POST | `/api/conversations`, `/api/messages/{user}` | token | Messaging |
| WS | `/ws/{username}` | — | Live push: presence, message, typing, read, notifications |

\* `GET /api/posts` is public; writes require a token.
