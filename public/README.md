# Zone Media

A full-stack social media web application with token-based authentication, a live post feed, likes and comments, a friend system, real-time messaging with typing indicators and read receipts, live notifications, and editable user profiles with custom photos. Built with a React 19 frontend and a FastAPI backend backed by a hosted Postgres database (Supabase).

Live frontend: https://johnadhikari.github.io/social-media/
Live API: https://zone-media-api.onrender.com

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
- Press Enter to send a message (a hint appears while typing); the Send button works too.
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
- Custom avatar and cover are stored per user and shown for friends, search results, suggestions, conversations and chat headers.

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
| Database | PostgreSQL hosted on Supabase (session pooler) |
| Realtime | WebSockets (same FastAPI app) |
| Security | bcrypt password hashing, Bearer tokens, CORS allow-list, input validation, SQL injection-safe parameterized queries |

## Getting Started

### 1. Backend (API)

```bash
cd backend
pip install -r requirements.txt
```

Set the database connection string:

```
# Windows PowerShell
$env:DATABASE_URL = "postgresql://<user>:<password>@<host>:5432/<db>"
```

Seed the demo data and start the server:

```bash
python seed.py            # optional: demo account, friends, posts, messages
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

The database schema is created automatically on startup (see Schema below). The backend requires the `DATABASE_URL` environment variable; without it, the app fails to start.

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
  app.py          FastAPI application: schema, auth, posts, friends, messaging, WebSockets
  seed.py         Idempotent seed script (demo account, friends, posts, messages)
  requirements.txt
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
