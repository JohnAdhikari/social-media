# Zone Media — Project Memory

> Read this file to recall project state without re-exploring.

---

## Stack

- **Frontend:** React 19 + Vite 7 + Tailwind 4 (no Tailwind — uses custom CSS vars)
- **Backend:** Python FastAPI + Supabase Postgres (free tier, project `fpfecsisksqseuhysesk`)
- **Supabase MCP:** configured in `opencode.json`, project ref `fpfecsisksqseuhysesk`
- **Real-time:** WebSocket (`/ws/{username}`)
- **Deploy (frontend):** GitHub Pages via `gh-pages` branch → https://JohnAdhikari.github.io/social-media
- **Deploy (backend):** Render free tier → https://zone-media-api.onrender.com (Blueprint: `render.yaml`)
- **Repo:** JohnAdhikari/social-media, branch `main`

## Config

- `public/config.js` → sets `window.ZONE_API` and `window.ZONE_WS` for the deployed frontend
  - `ZONE_API` must include `/api` suffix: `https://zone-media-api.onrender.com/api`
  - `ZONE_WS` does NOT include path: `wss://zone-media-api.onrender.com` (WebSocket path is `/ws/{username}`)
- Vite dev proxy: `/api` → `http://127.0.0.1:8000` and `/ws` → `ws://127.0.0.1:8000`
- `.env` at root — never commit; has NVIDIA keys
- `DATABASE_URL` — Supabase Postgres via **Session pooler (IPv4)**:
  `postgresql://postgres.fpfecsisksqseuhysesk:CLB39EF880John@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`
  - ⚠️ The *direct* connection (`db.<ref>.supabase.co`) resolves to **IPv6-only** and will NOT work from Render ("Network is unreachable"). Always use the pooler host.
  - Password must not contain special chars needing percent-encoding.

## Schema (SQLite)

- `users` — id, username (unique), email (unique), password_salt, password_hash, bio, avatar (data URL), cover (data URL), created_at
- `sessions` — token (PK), username, created_at, expires_at
- `posts` — id, username, text, picture, category, likes, created_at
- `comments` — id, post_id (FK), username, text, created_at
- `friends` — id, user_a (sorted), user_b (sorted), created_at; UNIQUE(user_a, user_b)
- `friend_requests` — id, from_user, to_user, status ('pending'/'accepted'), created_at; UNIQUE(from_user, to_user)
- `messages` — id, from_user, to_user, text, read (0/1), created_at
- `message_requests` — id, from_user, to_user, text, status ('pending'/'accepted'), created_at
- `notifications` — id, username, type, actor, post_id (nullable), text, read, created_at

## Key API Endpoints

- Auth: `POST /api/register` (username, email, password), `POST /api/login` (username_or_email, password), `POST /api/logout`, `GET /api/me`, `PUT /api/me` (bio/avatar/cover; explicit `null` clears a field, omitted fields untouched)
- Posts: `GET /api/posts`, `POST /api/posts`, `DELETE /api/posts/{id}`, `POST /api/posts/{id}/like`, `POST /api/posts/{id}/comments`
- Friends: `GET /api/friends`, `POST /api/friends/request`, `POST /api/friends/respond` (accept: from_user + accept bool), `POST /api/friends/remove`
- Messages: `GET /api/conversations`, `GET /api/messages/{user}`, `POST /api/messages/{user}` (non-friend → stored in message_requests)
- Message Requests: `GET /api/message-requests`, `POST /api/message-requests/{id}/accept`, `POST /api/message-requests/{id}/decline`
- Notifications: `GET /api/notifications`, `POST /api/notifications/read`
- Users: `GET /api/users/search?q=`, `GET /api/users/suggest`, `GET /api/users/{username}`, `GET /api/users/{username}/posts`
- Online: `GET /api/online`
- WebSocket: `ws://{host}/ws/{username}`

## Frontend Structure

- `src/api.js` — REST client (uses `window.ZONE_API` or `/api`)
- `src/realtime.js` — WebSocket singleton (uses `window.ZONE_WS` or protocol/host); `connect(username)`, `send(obj)`, `onRealTime(fn)`
- `src/App.jsx` — Routes: `/` (Login), `/signup`, `/homepage`, `/messages`, `/messages/:username`, `/profile`, `/profile/:username`
- `src/main.jsx` — HashRouter wrapping App
- `src/HomePage/HomePage.jsx` — Main layout (Feed/Explore tabs + sidebar)
- `src/HomePage/ContactList/Contact.jsx` — Friends list, friend requests, user search, suggested friends
- `src/HomePage/DisplayPosts/DisplayPosts.jsx` — Post feed
- `src/HomePage/NavigationBar/NavigationBar.jsx` — Top nav + notification bell + theme toggle
- `src/messages/Messages.jsx` — Chat (conversations list + message requests + user search + thread)
- `src/profile/Profile.jsx` — Own profile + other profiles (friend management)
- `src/login/Login.jsx` — Login (Quick Demo Sign In → John Adhikari / demo1234)
- `src/login/SignUp.jsx` — Registration (firstName + lastName = username)
- `src/hooks/useNotifications.js` — Notification polling + WS updates
- `src/hooks/usePresence.js` — Online status tracking
- `src/hooks/useGsapReveal.js` — Scroll-triggered reveals

## Messaging System (2026-08-07)

- Friends → direct messages (normal flow)
- Non-friends → messages go to `message_requests` table; recipient sees "Message Requests" tab in Messages page → Accept (migrates to messages table) / Decline (deletes)
- "Message Request" banner shows in thread when chatting with non-friend

## Key Behavior Notes

- Render free tier: ephemeral SQLite — DB resets on instance restart; `seed.py` re-seeds on every boot
- Seed creates: demo account (John Adhikari/demo1234), Demo Friend, Sara Khan (pending request), 5 posts, 3 messages, 1 notification
- Token auth: `zone_token` in localStorage; 401 → redirect to login
- **WebSocket auth:** `/ws?token=<zone_token>` (NOT `/ws/{username}` anymore). Invalid/missing token → close code 4001
- **Password hashing:** bcrypt for new accounts; login falls back to legacy HMAC-SHA256 for pre-migration accounts (uses `password_salt`)
- **Security:** CORS restricted to GitHub Pages + localhost:5173/5174; input validation via Pydantic `Field`; LIKE wildcards escaped; email only returned to the owner
- All API calls require `Authorization: Bearer {token}` header (except register/login)
- `friends` table uses alphabetical sorting: user_a = min(name1, name2), user_b = max(name1, name2)

## Dev Commands

```bash
# Frontend (Vite dev server on :5173, proxies /api + /ws to :8000)
cd src/..  # zone-media root
npm run dev
npm run build
npm run lint
npm run deploy  # build + push to gh-pages

# Backend (FastAPI on :8000)
cd backend
python -m uvicorn app:app --reload --port 8000
python seed.py  # re-seed demo data

# Stop stray dev servers
Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## Gotchas

- `config.js` ZONE_API MUST end with `/api` — without it, all fetch calls hit 404 "Not Found"
- `.vite/` folder: add to `.gitignore` and `eslint.config.js` globalIgnores to avoid lint noise
- Render free tier: data now persists via Supabase Postgres (no more ephemeral DB)
- First Render cold start takes 20-30s; Supabase connection pooling keeps queries fast
- CORS: `allow_origins=["*"]` + `allow_credentials=True` — browser echoes the Origin header
- `respond_friend_request` now updates the notification type from `friend_request` → `friend_accept` (fixes stale accept/decline buttons)

## Pending / Future

- ~~Persistent DB~~ ✅ Done — migrated to Supabase Postgres (free tier)
- Frontend: could migrate to Tailwind CSS for consistency
- Add rich media (image uploads in posts + messages)
- User search in navbar (currently only in Contact sidebar and Messages)
