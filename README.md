# Zone Media

#### Video Demo: <URL HERE>

#### Description:

Zone Media is a full-stack social media web application that I built as my final project for CS50x. It is a real, deployed product with a live frontend (https://johnadhikari.github.io/social-media/) and a hosted API (https://zone-media-api.onrender.com), and it deliberately draws on everything the course taught: Python for the backend, JavaScript (React) for the frontend, and SQL for persistent data. The project also goes well beyond the course material by adding real-time features over WebSockets, token-based authentication, and a production deployment pipeline.

The app lets a user register and log in with a hashed password, then explore a live post feed where they can create posts (with optional images and category tags), like posts, and comment on them. A search bar lets them find posts, tags, or other users, and a friend system lets them send, accept, and decline friend requests and remove friends. The headline feature is real-time direct messaging over WebSockets: messages arrive instantly without a page refresh, threads show typing indicators, online/offline presence dots, and read receipts (one check for sent, two for read). Non-friends cannot message a user directly — their messages are held in a request queue that the user can accept or decline, a privacy design borrowed from real platforms like Facebook. Live notifications (friend requests, accepts, likes, comments) also arrive over the WebSocket connection and appear in a navbar bell with an unread counter and inline accept/decline actions. Finally, users can edit their profile with a custom bio, profile photo, and cover photo that sync across the whole app, and the entire UI supports a dark/light theme toggle that persists between sessions.

The backend is a single FastAPI application (`backend/app.py`) written in Python. I chose FastAPI over Flask because its Pydantic integration gives me request validation almost for free and its native WebSocket support keeps the real-time and REST layers in one codebase. The schema is created automatically on startup and covers eight tables: `users`, `sessions`, `posts`, `comments`, `friends`, `friend_requests`, `messages`, `message_requests`, and `notifications`. The database layer is dual-mode: when a `DATABASE_URL` is set it connects to PostgreSQL, and when it is not it falls back to a local SQLite file (`backend/data/social.db`) so the app can run fully offline with zero setup. Passwords are stored as bcrypt hashes with per-user salts, and all SQL is written with parameterized queries so that user input can never inject SQL. A dual-mode password verifier keeps legacy accounts created under an earlier SHA-256 scheme able to sign in until they are re-hashed on the next seed. `backend/seed.py` is an idempotent script that creates a demo account, a friend, a pending request, sample posts, and a small message history so the app can be tried instantly. `backend/requirements.txt` and `render.yaml` package the backend for deployment on Render.

The frontend is a React 19 application built with Vite (`src/`). `src/App.jsx` defines the hash-based routing and the overall layout. `src/api.js` is a thin REST client that talks to the API through a runtime-configurable base URL (`window.ZONE_API` or the Vite dev proxy), which is what lets the same codebase run in development against a local server and in production against the hosted one. `src/realtime.js` wraps the WebSocket connection, handling connection, sending, and event subscriptions so components share one socket instead of opening their own. Feature code lives in `src/HomePage/` (feed, contacts sidebar, AboutMe card), `src/messages/` (chats, message requests, search, chat thread), `src/profile/` (profile page and the edit-profile modal), and `src/login/` (login and sign-up). Shared behavior is extracted into hooks in `src/hooks/` — `useNotifications`, `usePresence`, `useUnreadMessages`, and `useGsapReveal` for scroll animations. `public/config.js` lets the deployed build be pointed at a different API without a rebuild, which I used to switch between the local backend and the Render deployment. Images attached to posts are resized and compressed on the client (to a ~1280px JPEG data URL) before upload, the same approach used for avatar and cover photos, which keeps database rows small and uploads fast.

I made several deliberate design choices worth explaining. The most important was the non-friend message gate: messages from non-friends do not create a thread in the inbox; they go to a request queue instead, and accepting a request migrates the conversation into the inbox. This protects users from unsolicited DMs and was the most complex part of the app to implement because it touches the database schema, the REST API, and the messaging UI. I also chose to store profile photos as client-resized, compressed data URLs in the database rather than files in object storage — a pragmatic trade-off that keeps the free deployment tiers simple and the app fully self-contained at the cost of larger database rows. On the frontend, I used GSAP for entrance animations but respected `prefers-reduced-motion`, and I kept the layout responsive with a desktop navbar, a mobile drawer, and a mobile bottom bar. Dark mode is implemented with a theme context that persists to `localStorage`.

The app is fully deployed and usable today. During development I used AI tooling as an amplifier — for generating boilerplate and debugging WebSocket edge cases — but the architecture, schema, and the design decisions above are my own, and the code carries comments where such tools were used. Zone Media solves a real problem (building and operating a full real-time social application end to end) and demonstrates every layer of the stack working together in production.

---

## Getting Started

### 1. Backend (API)

```bash
cd backend
pip install -r requirements.txt
```

The backend runs with zero configuration: if no `DATABASE_URL` is set, it creates and uses a local SQLite database (`backend/data/social.db`). To use PostgreSQL instead, set the connection string first:

```
# Windows PowerShell
$env:DATABASE_URL = "postgresql://<user>:<password>@<host>:5432/<db>"
```

Seed the demo data and start the server:

```bash
python seed.py            # optional: demo account, friends, posts, messages
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

The database schema is created automatically on startup.

### 2. Frontend

```bash
npm install
npm run dev
```

In development, Vite proxies `/api` and `/ws` to `http://127.0.0.1:8000`, so no CORS or base URL configuration is needed. Open http://localhost:5173.

### Demo Account

After seeding, log in with:

- Username: `John Adhikari`
- Password: `demo1234`

The seed also creates a demo friend, a pending friend request from Sara Khan, five sample posts and a small message history.

## Features

### Authentication
- Register, login and logout with hashed passwords (bcrypt) and opaque bearer session tokens.
- Sessions last 30 days; an expired or invalid token returns 401 and redirects to the login screen.
- A "Quick Demo Sign In" button logs into a pre-seeded demo account.
- Dual-mode password verification keeps legacy accounts (created with the old SHA-256 scheme) able to sign in until they are re-hashed on the next seed.

### Post Feed
- Create posts with optional image and a category tag.
- Like and comment on posts; likes and comments push real-time notifications.
- Delete your own posts.
- Feed / Explore tabs and a search bar for posts, tags and users.

### Friends
- Search for users by username or email.
- Send, accept and decline friend requests; remove friends.
- Suggested friends widget on the homepage sidebar.

### Real-Time Messaging
- Instant message delivery over WebSockets (no page refresh).
- Typing indicator, online/offline presence dots and read receipts (single check for sent, double check for read).
- Open a chat from the messages page, a profile page, or the user search.
- An unread-message badge on the navbar messages icon (and in the mobile drawer) updates live when messages arrive and clears when threads are read.

### Message Requests
- Non-friends cannot message you directly; their messages are held in a request queue.
- Accept a request to migrate the conversation into your inbox, or decline to discard it.
- A banner in the thread warns you when you are chatting with a non-friend.

### Live Notifications
- Friend requests, friend accepts, likes and comments arrive over WebSocket and appear in the navbar bell with an unread count and inline accept/decline actions.

### Profiles
- Edit your bio, profile photo and cover photo from the Edit Profile modal (photos are resized and compressed on the client before upload).
- Your photo and cover sync across the profile page, the homepage AboutMe card, the contacts sidebar and the messages page.

### UI / UX
- Dark and light theme toggle, persisted across sessions.
- Responsive layout: desktop navbar, mobile drawer and a mobile bottom bar.
- GSAP entrance animations with `prefers-reduced-motion` respected.
- Back buttons on the profile and messages pages.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite 7, react-router-dom 7 (HashRouter), Tailwind CSS 4, GSAP |
| Backend | FastAPI (Pydantic v2, psycopg2) |
| Database | PostgreSQL hosted on Supabase (session pooler) or local SQLite fallback |
| Realtime | WebSockets (same FastAPI app) |
| Security | bcrypt password hashing, Bearer tokens, CORS allow-list, input validation, SQL injection-safe parameterized queries |

## Deployment

### Backend on Render (free)

1. Push this repository to GitHub.
2. Create a new Blueprint from the repo in the Render dashboard (`render.yaml` is included) or create a web service from the repo root.
3. Set the environment variable:
   - `DATABASE_URL` — a Supabase/Neon connection string (use the IPv4-compatible session pooler, not a bare IPv6 host, since Render cannot reach IPv6-only hosts).
4. Render auto-deploys on every push to `main`. The start command seeds the demo data and launches uvicorn.

### Frontend on GitHub Pages

1. `public/config.js` points the built site at the hosted backend:

   ```js
   window.ZONE_API = "https://zone-media-api.onrender.com/api";
   window.ZONE_WS  = "wss://zone-media-api.onrender.com";
   ```

   `ZONE_API` is the REST base URL (no trailing slash), `ZONE_WS` is the WebSocket base (scheme + host, no trailing slash).

2. Publish the build:

   ```bash
   npm run build
   npm run deploy   # publishes dist/ to the gh-pages branch
   ```

## WebSocket Protocol

Connect to `/ws?token=<your_session_token>`. Tokens are validated server-side; invalid or missing tokens close the connection with code 4001.

Events sent by the server:

| Event | Payload | Purpose |
|---|---|---|
| `message` | `{ type, message }` | A new message in a thread |
| `typing` | `{ type, from, typing }` | Typing indicator |
| `read` | `{ type, from, to }` | Messages were read |
| `friend_request` / `friend_accept` | `{ type, actor }` | Friend activity |
| `like` / `comment` | `{ type, actor, ... }` | Post activity |
| `presence` | `{ type, usernames }` | Online status changes |

## API Overview

All endpoints require an `Authorization: Bearer <token>` header unless marked public.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/register` | Create account, returns session token |
| POST | `/api/login` | Login, returns session token |
| POST | `/api/logout` | Invalidate the session |
| GET | `/api/me` | Current user profile |
| PUT | `/api/me` | Update bio / avatar / cover (explicit `null` clears a field) |
| GET | `/api/online` | Usernames with live WebSocket connections |
| GET | `/api/notifications` | Notification list |
| POST | `/api/notifications/read` | Mark notifications read |
| GET | `/api/posts` | Public post feed |
| POST | `/api/posts` | Create a post |
| DELETE | `/api/posts/{id}` | Delete a post |
| POST | `/api/posts/{id}/like` | Like / unlike a post |
| POST | `/api/posts/{id}/comments` | Comment on a post |
| GET | `/api/users/search?q=` | Search users |
| GET | `/api/users/suggest` | Suggested friends |
| GET | `/api/users/{username}` | Public user profile |
| GET | `/api/users/{username}/posts` | A user's posts |
| GET | `/api/friends` | Friends, pending requests and stats |
| POST | `/api/friends/request` | Send a friend request |
| POST | `/api/friends/respond` | Accept / decline a request |
| POST | `/api/friends/remove` | Remove a friend |
| GET | `/api/conversations` | Chat list with unread counts and avatars |
| GET | `/api/messages/{user}` | Full thread with a user (marks their messages read) |
| POST | `/api/messages/{user}` | Send a message (goes to requests for non-friends) |
| GET | `/api/message-requests` | Pending inbound message requests |
| POST | `/api/message-requests/{id}/accept` | Accept a request (migrates messages) |
| POST | `/api/message-requests/{id}/decline` | Decline a request |
| GET | `/health` | Health check (public) |

## Schema

- `users` — id, username (unique), email (unique), password_salt, password_hash, bio, avatar (data URL), cover (data URL), created_at
- `sessions` — token (PK), username, created_at, expires_at
- `posts` — id, username, text, picture, category, likes, created_at
- `comments` — id, post_id (FK), username, text, created_at
- `friends` — id, user_a, user_b (alphabetically sorted pair), created_at, unique pair
- `friend_requests` — id, from_user, to_user, status, created_at
- `messages` — id, from_user, to_user, text, read (0/1), created_at
- `message_requests` — id, from_user, to_user, text, status, created_at
- `notifications` — id, username, type, actor, post_id (nullable), text, read, created_at

## Security Notes

- Passwords are hashed with bcrypt; new accounts never store plaintext or SHA-256 hashes.
- All SQL uses parameterized queries; LIKE patterns escape `%`, `_` and `\`.
- Request payloads are validated with Pydantic (length and pattern constraints).
- CORS is restricted to the GitHub Pages origin and local development hosts.
- Email addresses are only returned to the account owner; public user payloads expose the username, bio and photos only.
- WebSocket connections require a valid session token.

## Project Structure

```
backend/
  app.py          FastAPI application: schema, auth, posts, friends, messaging, WebSockets (Postgres or SQLite)
  seed.py         Idempotent seed script (demo account, friends, posts, messages)
  requirements.txt
  data/           Local SQLite database (created automatically when no DATABASE_URL is set)
render.yaml       Render blueprint for the backend service
src/
  api.js          REST client (uses window.ZONE_API or /api)
  realtime.js     Shared WebSocket helpers (connect / send / onRealTime)
  App.jsx         Routes (hash-based)
  HomePage/       Layout: navbar, feed, contacts sidebar, AboutMe card
  messages/       Chats, message requests, search and the chat thread
  profile/        Profile page with the Edit Profile modal
  login/          Login and sign-up pages
  hooks/          useNotifications, usePresence, useUnreadMessages, useGsapReveal
public/
  config.js       Runtime backend URLs for the deployed build
```
