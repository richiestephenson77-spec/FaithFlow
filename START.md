# PrayerConnect — Getting Started

## Prerequisites
- Node.js 18+
- PostgreSQL running locally (or a cloud DB like Supabase/Neon)
- An Anthropic API key (for the Bible Bot)

## 1. Set up environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/prayerconnect"
JWT_SECRET="your-super-secret-jwt-key"
PORT=5000
CLIENT_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."   # ← get from console.anthropic.com
```

## 2. Install & migrate

```bash
# Backend
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed   # optional: adds demo users & prayer requests
```

```bash
# Frontend
cd frontend
npm install
```

## 3. Run

Terminal 1:
```bash
cd backend && npm run dev
```

Terminal 2:
```bash
cd frontend && npm start
```

Opens at **http://localhost:3000**

## Demo Accounts (after seeding)
- `alice@example.com` / `password123`
- `bob@example.com` / `password123`

---

## Phase 1 Features
- ✅ Sign up / Login (JWT)
- ✅ Prayer request feed with live praying counts
- ✅ Prayer session with timer + Socket.io real-time notifications
- ✅ Prayer metrics dashboard (streak, hours, avg session)
- ✅ Follow/unfollow users ("Believers")
- ✅ Community posts (Update / Testimony / Verse)
- ✅ Likes & comments

## Phase 2 Features
- ✅ Instagram-style profile with cover photo, post grid, stat cards
- ✅ Tappable Believers/Following lists
- ✅ Photos & video posts with autoplay (IntersectionObserver)
- ✅ Multiple media per post with carousel
- ✅ Church pages — register, follow, post updates/events
- ✅ Discover churches by search / location
- ✅ AI Bible Bot powered by Claude (claude-sonnet-4-6)
  - Warm, Christian-only assistant
  - Conversation history saved per user
  - Starter question suggestions

---

## API Routes

### Auth
| POST | /api/auth/signup | Register |
| POST | /api/auth/login | Login |

### Users
| GET | /api/users/me | Current user profile |
| PUT | /api/users/me | Update profile (multipart: profilePhoto, coverPhoto) |
| GET | /api/users/me/dashboard | Prayer stats |
| GET | /api/users/:id | View any profile |
| POST | /api/users/:id/follow | Toggle follow |
| GET | /api/users/:id/followers | Follower list |
| GET | /api/users/:id/following | Following list |

### Prayers
| GET | /api/prayers/feed | Prayer request feed |
| POST | /api/prayers | Create request |
| POST | /api/prayers/:id/start | Start session |
| POST | /api/prayers/session/:id/end | End session |

### Posts
| GET | /api/posts | Community feed |
| GET | /api/posts/user/:id | User's posts |
| POST | /api/posts | Create post (multipart: media[]) |
| POST | /api/posts/:id/like | Toggle like |
| GET | /api/posts/:id/comments | All comments |
| POST | /api/posts/:id/comments | Add comment |

### Churches
| GET | /api/churches/mine | Admin's church |
| GET | /api/churches/search?q=&location= | Search |
| GET | /api/churches/:id | Church page |
| POST | /api/churches | Register church |
| PUT | /api/churches/:id | Edit church |
| POST | /api/churches/:id/follow | Toggle follow |
| POST | /api/churches/:id/posts | Create church post |

### Bible Bot
| GET | /api/bible-bot/history | Chat history |
| POST | /api/bible-bot/chat | Send message |
| DELETE | /api/bible-bot/history | Clear history |

### Notifications
| GET | /api/notifications | All notifications |
| POST | /api/notifications/read-all | Mark all read |
