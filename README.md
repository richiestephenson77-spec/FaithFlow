# FaithBridge

A Christian faith-community PWA — prayer requests, prayer cells (live WebRTC
audio), churches, pastors, messaging, and a Bible assistant.

- **Frontend:** React (Create React App), Tailwind, deployed on Vercel
- **Backend:** Node/Express + Socket.IO, deployed on Railway
- **Database:** PostgreSQL (Supabase) via Prisma ORM

## Local setup

```bash
# Backend
cd backend
cp .env.example .env      # fill in real values (never commit .env)
npm install
npx prisma migrate deploy
npm start

# Frontend
cd frontend
cp .env.example .env      # fill in real values
npm install
npm start
```

## Environment variables

All secrets live in `.env` files, which are gitignored. See
[`backend/.env.example`](backend/.env.example) and
[`frontend/.env.example`](frontend/.env.example) for the full list of
required variables and placeholder formats.

- **Backend `.env`** holds server-only secrets: `DATABASE_URL`, `JWT_SECRET`,
  `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_KEY`, `RESEND_API_KEY`, and the
  Cloudinary keys. None of these are ever sent to the browser.
- **Frontend `REACT_APP_*`** vars are compiled into the client bundle and are
  therefore **public**. Only public-safe values belong there (PostHog key,
  Mapbox public token, and the Metered TURN credentials, which WebRTC requires
  client-side). Never put a server-side secret behind a `REACT_APP_` prefix.

## ⚠️ Security: rotate previously-exposed secrets

Earlier revisions of this repo committed real secrets to version control.
**Removing them from the current files does not remove them from git history** —
anyone with the history can still read the old values. Before/at deploy, rotate
every secret that was ever committed:

1. **`backend/.env` was committed** (initial commit through the commit that
   removed it from tracking). Rotate all values that existed there:
   - `DATABASE_URL` — reset the Supabase database password
   - `JWT_SECRET` — regenerate (invalidates existing sessions, expected)
   - `ANTHROPIC_API_KEY` — revoke and reissue in the Anthropic console
   - `GOOGLE_PLACES_KEY` — regenerate/restrict in Google Cloud Console
2. **TURN credentials were hardcoded** in `frontend/src/hooks/usePrayerCellAudio.js`
   (now env-only). Rotate the Metered TURN username/credential in the Metered
   dashboard.

Also enforce **Row Level Security on every Supabase table** — the Postgres
connection here is server-side via Prisma, but if a Supabase anon key is ever
introduced client-side, RLS is what prevents it from exposing the whole database.

Optionally, scrub the secrets from history entirely:

```bash
git filter-repo --path backend/.env --invert-paths
```

(Rotation is still required even after scrubbing, since the old values may
already have been cloned or cached.)
