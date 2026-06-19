# FaithFlow — CLAUDE.md

## What It Is
FaithFlow is a Christian faith-based social platform where believers can post prayer requests, pray for others with a timed session, track daily prayer streaks and quotas, send direct messages, share anonymous confessions, connect with verified pastors, read the KJV Bible, join churches, and post community updates. It is a mobile-first PWA (max-width 448px) deployed on Railway (backend) + Vercel (frontend).

---

## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | React 18, React Router v6, Tailwind CSS, Axios |
| Backend | Node.js, Express |
| Database | PostgreSQL via Prisma ORM (hosted on Supabase) |
| Real-time | Socket.io (server + client) |
| Auth | JWT (stored in localStorage), `authenticate` middleware |
| Media uploads | Cloudinary (profile photo, cover photo, post media) |
| Email | Resend (password reset only; sender: onboarding@resend.dev) |
| Bible API | bible-api.com — free, no key, public domain KJV |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) for BibleBot |
| Deploy | Railway (backend auto-deploy on push), Vercel (frontend) |

---

## Folder Structure

```
Prayer app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Single source of truth for all models
│   │   └── migrations/            # Never edit manually; apply with migrate dev
│   └── src/
│       ├── index.js               # Express app, Socket.io setup, all route mounts
│       ├── middleware/auth.js     # JWT verify → sets req.user = { id, email }
│       ├── controllers/
│       │   ├── authController.js       # signup, login, forgot/reset password
│       │   ├── userController.js       # getProfile, getMe, updateProfile, follow, getDashboard, searchUsers
│       │   ├── prayerController.js     # getFeed, createRequest, startSession, endSession, markAnswered, getMyRequests, editRequest, addUpdate, getAnsweredFeed, getRequest
│       │   ├── postController.js       # CRUD posts, likes, comments
│       │   ├── churchController.js     # create/update church, posts, follow
│       │   ├── messageController.js    # getConversations, startConversation, getMessages, sendMessage, markRead, getTotalUnread
│       │   ├── confessionController.js # getConfessions, createConfession, encourage (toggle), getComments, addComment — userId NEVER returned
│       │   ├── pastorController.js     # getPastors, submitPrayerRequest, getMyRequests, getPastorDashboard, respondToRequest
│       │   ├── quotaController.js      # getToday, updateSettings, getQueue, completePrayer
│       │   └── bibleBotController.js   # chat (Anthropic), getHistory, clearHistory
│       ├── routes/                # One file per domain, all require authenticate except auth routes
│       └── services/
│           ├── socketService.js   # setupSocket(), notifyUser(), connectedUsers Map, conversation rooms
│           └── cloudinaryService.js # multer + cloudinary upload config
└── frontend/
    └── src/
        ├── App.js                 # All routes. PrivateRoute wraps Layout+SocketProvider. PublicRoute redirects if authed.
        ├── utils/api.js           # Axios instance; baseURL = /api (proxied in dev); auto-attaches Bearer token; redirects to /login on 401
        ├── contexts/
        │   ├── AuthContext.js     # user, login(), logout(), updateUser(), loading
        │   └── SocketContext.js   # socket ref, notifications[], unreadCount (bell), unreadMessages (chat tab), markAllRead(), markMessagesRead()
        ├── components/
        │   ├── Layout.js          # Sticky header + 5-tab nav (Home/Explore/Search/Chats/Profile) + FAB Pray button + Toast
        │   ├── Logo.js            # SVG wordmark — "Fai†hFlow" with cross replacing t
        │   ├── Avatar.js          # User photo or initials fallback
        │   ├── PrayerSession.js   # Full-screen prayer timer (15s minimum, streak celebration on end)
        │   ├── StreakCelebration.js # Canvas confetti + streak count + milestone message
        │   ├── NewPrayerRequestModal.js # Sheet modal — title, body, 7-category grid, urgent toggle
        │   ├── MyPrayerRequestsDrawer.js # Slide-up drawer — own requests, edit/answer/update/delete actions
        │   ├── TestimonyModal.js  # Mark prayer as answered with testimony text
        │   └── Toast.js           # Auto-dismiss notification toast
        └── pages/
            ├── Home.js            # Prayer feed + Prayer Room tile + streak chip + category filter tabs
            ├── PrayerPage.js      # /prayer — quota widget + settings sheet + Start Daily Prayers
            ├── PrayerQueue.js     # Full-screen queue mode — one prayer at a time, 15s timer, skip, confetti on complete
            ├── PrayerDetail.js    # Single prayer — Georgia serif body, testimony, stats
            ├── Profile.js         # Profile, prayer stats, Prayer Warrior badge, posts/prayers tabs
            ├── Explore.js         # Feature hub — Bible, Churches, Confessions, Pastors, coming-soon cards
            ├── Bible.js           # KJV reader — 3-step picker (book→chapter→verse), chapter nav, copy verse
            ├── Community.js       # Social post feed
            ├── Messages.js        # DM inbox + user search
            ├── ChatThread.js      # Real-time chat with typing indicator
            ├── Confessions.js     # Anonymous confession wall + encourage + comments
            ├── Pastors.js         # Verified pastor directory + prayer request modal
            ├── MyPastorRequests.js # User's submitted pastor requests with expandable responses
            ├── PastorDashboard.js # Pastor-only — incoming requests, mark prayed, respond
            ├── Search.js          # Global user search
            ├── Notifications.js   # Bell notification list
            ├── Churches.js / ChurchPage.js # Church directory + individual church
            ├── BibleBot.js        # AI Bible chat (requires ANTHROPIC_API_KEY)
            ├── Settings.js        # Account settings, logout
            ├── Login/Signup/ForgotPassword/ResetPassword.js
```

---

## Prisma Models (key fields only)

**User** — `id, email, password, name, bio, churchName, location, profilePhoto, coverPhoto`
- Streak: `prayerStreak, longestPrayerStreak, lastPrayerDate`
- Quota: `dailyPrayerQuota (default 5), prayerWarriorBadge, totalPeoplesPrayedFor, prayerWarriorEarnedAt`
- Pastor: `isVerifiedPastor, pastorBio, pastorChurch, pastorTitle`

**PrayerRequest** — `title, body, category (enum GENERAL/HEALTH/FAMILY/CAREER/FINANCIAL/RELATIONSHIP/SPIRITUAL), isUrgent, isActive, isAnswered, answeredAt, testimonyMessage, updateMessage`

**PrayerSession** — `userId, prayerRequestId, startedAt, endedAt, durationSeconds`

**DailyQuotaLog** — `userId, date (YYYY-MM-DD string), target, completed, isComplete` — @@unique([userId, date]) — auto-resets daily, no cron needed

**Conversation** + **ConversationParticipant** (`userId, lastReadAt`) + **Message** (`senderId, content, isRead`)

**Confession** — `content, category (string), userId` — **confessionController strips userId before returning**
**ConfessionEncouragement** — @@unique([confessionId, userId]) (toggle like)
**ConfessionComment** — all returned as "Anonymous Believer", never reveals userId

**PastorPrayerRequest** — `userId, pastorId, request, isAnonymous, status (PENDING/PRAYED/RESPONDED), response`

**Post** — `content, type (UPDATE/TESTIMONY/VERSE), bibleVerse` + **PostMedia** (`url, type IMAGE/VIDEO, order`)

**Notification** — `type (enum: PRAYER_STARTED/NEW_FOLLOWER/POST_LIKE/POST_COMMENT/CHURCH_POST/NEW_MESSAGE)`

**Church** + **ChurchFollow** + **ChurchPost** (`type: UPDATE/EVENT/SERVICE, eventDate`)

**PasswordResetToken** — `token (unique), expiresAt, used`

**BibleBotMessage** — `role, content` (conversation history per user)

---

## API Routes

All routes require `authenticate` middleware (JWT) unless noted.

```
POST /api/auth/signup              — no auth required
POST /api/auth/login               — no auth required
POST /api/auth/forgot-password     — no auth required
POST /api/auth/reset-password      — no auth required

GET  /api/users/me                 — own profile
GET  /api/users/me/dashboard       — streak, longestStreak, totalSessions
PUT  /api/users/me                 — update profile (multipart: profilePhoto, coverPhoto via Cloudinary)
GET  /api/users/search?q=          — user search
GET  /api/users/:id                — public profile + stats
POST /api/users/:id/follow         — toggle follow
GET  /api/users/:id/followers
GET  /api/users/:id/following

GET  /api/prayers/feed?category=   — prayer feed (urgent pinned top)
POST /api/prayers                  — create request {title, body, category, isUrgent}
GET  /api/prayers/answered         — answered prayers feed
GET  /api/prayers/mine             — own requests
GET  /api/prayers/:id              — single request
PUT  /api/prayers/:id              — edit request
POST /api/prayers/:id/start        — start prayer session → returns session
POST /api/prayers/session/:id/end  — end session → returns {durationSeconds, streak}
POST /api/prayers/:id/answered     — mark answered {testimonyMessage}
POST /api/prayers/:id/update       — add update message
DELETE /api/prayers/:id

GET  /api/quota/today              — get/create today's DailyQuotaLog
POST /api/quota/settings           — {target} update dailyPrayerQuota on User
GET  /api/quota/queue              — n random prayers (urgent first, excludes own + prayed today)
POST /api/quota/complete-prayer    — {prayerRequestId} increment log, award badge if first completion

GET  /api/messages/unread          — total unread count
GET  /api/messages/conversations   — inbox
POST /api/messages/conversations   — {userId} start or return existing conversation
GET  /api/messages/conversations/:id  — messages in conversation
POST /api/messages/conversations/:id  — {content} send message
PUT  /api/messages/conversations/:id/read

GET  /api/confessions?category=    — anonymous feed (userId stripped)
POST /api/confessions              — {content, category}
POST /api/confessions/:id/encourage — toggle encourage
GET  /api/confessions/:id/comments
POST /api/confessions/:id/comments — {content}

GET  /api/pastors                  — verified pastors only
POST /api/pastors/:pastorId/pray   — {request, isAnonymous}
GET  /api/pastors/my-requests      — user's submitted requests
GET  /api/pastors/dashboard        — pastor-only, masked anonymous requesters
PUT  /api/pastors/requests/:id     — {status, response} pastor responds

GET  /api/posts
POST /api/posts                    — multipart, supports images/video via Cloudinary
GET  /api/posts/user/:userId
POST /api/posts/:id/like
GET/POST /api/posts/:id/comments
DELETE /api/posts/:id

GET  /api/churches
POST /api/churches                 — create church
GET  /api/churches/mine
PUT  /api/churches/:id
POST /api/churches/:id/follow
POST /api/churches/:id/posts
GET  /api/churches/:id

GET  /api/notifications
POST /api/notifications/read-all

POST /api/bible-bot/chat           — {message} → Anthropic response
GET  /api/bible-bot/history
DELETE /api/bible-bot/history
```

---

## Socket Events

Server uses `connectedUsers` Map (userId → socketId). Socket joins on `query.userId`.

```
Server emits:
  notification       — to specific user socket (bell badge, toast)
  prayerStarted      — to prayer request owner when someone starts praying
  message_received   — to conversation room

Client emits:
  join_conversation  — joins room `conversation:${conversationId}`
  leave_conversation
  typing             — {conversationId, userName}
  stop_typing        — {conversationId}
```

`NEW_MESSAGE` notifications go to `unreadMessages` count (chat badge), not `unreadCount` (bell badge).

---

## Key Frontend Patterns

**Auth**: JWT stored in `localStorage` as `token`. `api.js` auto-attaches. 401 → redirect to `/login`.

**Navigation**: 5 tabs in bottom nav — Home `/`, Explore `/explore`, Search `/search`, Chats `/messages`, Profile `/profile`. FAB "Pray" button → `/prayer`. Hidden on `/prayer`, `/bible`, `/messages`.

**Styling**:
- `prayer-gradient` = `background: linear-gradient(135deg, #1e3a8a, #3b5bdb, #a855f7)` — use for all branded headers/buttons
- `faith-600` = `#2f4ac0` (primary blue), `faith-700` = `#1e3a8a` (dark blue)
- Amber `#f59e0b` / orange `#f97316` = accent/FAB/quota/streak colors
- Prayer text body: always `fontFamily: 'Georgia, serif'`, `font-style: italic` — no emojis in prayer text
- Cards: `bg-white rounded-2xl p-4 border border-gray-100 shadow-sm`
- All SVG icons (no emoji in UI except celebration screens)
- Logo: SVG in `Logo.js` — cross replaces the "t" in FaithFlow. Do NOT edit the x/y positions without testing.

**Prayer timer**: 15-second minimum enforced in `PrayerSession.js`. `endSession` backend calculates streak.

**Streak logic** (4 cases in `prayerController.endSession`):
1. Same day → no streak change
2. Yesterday → increment streak
3. Missed days → reset to 1
4. First ever → set to 1

**Queue mode**: `PrayerQueue.js` — full-screen overlay rendered in `Home.js` and `PrayerPage.js`. NOT a route.

**Anonymous confessions**: `confessionController` strips `userId` before every response. Never return `userId` from confession endpoints.

**Conversation participants**: Always use `include: { user: { select: {...} } }` inside participants — NOT `PARTICIPANT_SELECT = { user: {...} }` (flat). The correct shape is `{ include: { user: { select: {...} } } }`.

---

## Environment Variables

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql://...         # Supabase direct connection (port 5432)
JWT_SECRET=...
PORT=5001
CLIENT_URL=https://faithflow.vercel.app
ANTHROPIC_API_KEY=...                 # Only needed for BibleBot
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEND_API_KEY=...                    # Password reset emails
```

**Frontend** (`frontend/.env`):
```
REACT_APP_API_URL=https://your-railway-app.railway.app/api   # Production only; dev uses proxy
```

Frontend `package.json` has `"proxy": "http://localhost:5001"` — dev requests to `/api` proxy to backend.

---

## Running Locally

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill in values
npm run dev            # nodemon on port 5001

# Frontend (separate terminal)
cd frontend
npm install
npm start              # React dev server on port 3000, proxies /api to 5001

# Database
npm run db:migrate     # prisma migrate dev (runs against DATABASE_URL)
npm run db:generate    # after schema changes
npm run db:studio      # Prisma Studio GUI
```

**Migrations**: Always run `prisma migrate dev` locally against Supabase. If Prisma CLI can't connect (P1001), apply the SQL manually with `psql "postgresql://..."` then record in `_prisma_migrations` table. Railway runs `prisma migrate deploy` on every deploy via the `build` script.

---

## Coding Conventions

- **Controllers**: plain async functions, always `try/catch`, return JSON. No classes.
- **Routes**: thin — import controller, call `router.method(path, authenticate?, controller)`.
- **Frontend pages**: default export, hooks at top, early returns for loading/empty states.
- **No comments** unless the WHY is non-obvious.
- **No emojis in prayer/testimony UI** — use SVG icons. Emojis only in celebration/confetti screens.
- **Georgia serif** for all prayer request body text and testimony text.
- **Tailwind first** — use utility classes. Custom CSS only for `prayer-gradient`, `faith-*` colors, and `@keyframes` (e.g., `slideUp`).
- **avatar fallback**: `Avatar.js` renders initials if no `profilePhoto`.
- All IDs are `cuid()` strings.

---

## What NOT To Do

1. **Don't use `{ user: {...} }` in Prisma includes for ConversationParticipant** — use `{ include: { user: {...} } }`. The flat form causes "Unknown argument `user`" error.
2. **Don't run `prisma migrate dev` in background bash** — DNS resolution fails in sandbox. Run it foreground or apply SQL manually with `psql`.
3. **Don't add emojis to prayer cards, prayer text, or navigation** — design convention is SVG-only icons.
4. **Don't edit Logo.js SVG positions without checking** — the cross `x` position is tuned; a pixel change breaks the "Faith" spacing.
5. **Don't forget to emit to socket room** — messages go to `conversation:${conversationId}` room, not individual user sockets.
6. **Don't return `userId` from confession endpoints** — anonymous identity must never leak.
7. **Don't skip `prisma generate` after schema changes** — Railway runs it in `build` but local dev won't pick up new models without it.
8. **Don't use `prisma migrate deploy` for schema changes in dev** — use `migrate dev` (creates migration file). `migrate deploy` is for production only.
9. **Don't put logic in routes** — keep routes thin, all logic in controllers.
10. **Don't add a new Prisma relation without adding the inverse relation on User** — Prisma requires both sides defined.
11. **Don't use `isActive` filter on prayers without checking** — some queries intentionally omit it (e.g., answered feed).
12. **Don't duplicate `unreadCount` from `useSocket()`** — Layout.js previously had a bug from double-destructuring. Only destructure once.
