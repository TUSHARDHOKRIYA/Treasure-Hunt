# The Hunt — IEEE SB VU Treasure Hunt

A mobile-first web app for a 32-team, 4-arena treasure hunt with QR check-points, unique per-team questions, a server-side clock and a live organiser dashboard.

**Live site:** https://treasure-hunt-nine-hazel.vercel.app
- Teams: https://treasure-hunt-nine-hazel.vercel.app/login
- Organisers: https://treasure-hunt-nine-hazel.vercel.app/admin

Deployed on Vercel (region `sin1`, Singapore — next to the Supabase database) from the `main` branch; every push to `main` redeploys automatically.

## How the game works

1. **Login** – each team's device signs in with its team code (e.g. `TEAM07`) and password. Signing in is safe before the event: the clock does not start yet.
2. **Attendance** – the team's members are listed; tick who's present and a volunteer enters the PIN. **The team's clock starts here.**
3. **Arenas** – each team visits the 4 arenas in its own order and must scan **its** QR station (A/B/C) at each:
   - wrong arena → *"Incorrect arena"*
   - right arena, wrong station → *"Right arena, wrong QR code — find station B"*
   - correct → 4 questions unlock, one at a time.
4. **Questions** – all multiple choice, except the riddle:
   - Q1–Q3: arena-themed MCQs. A wrong option **locks the question for 45 s**.
   - Q4 in the first three arenas: a riddle — **type the next arena's name** (capitals don't matter; a wrong guess = 5 s wait).
   - Last arena: Q3 and Q4 are **IEEE SB VU** questions with a takeaway message; Q4 stops the clock.

| Arena | Theme |
|---|---|
| The Mind Maze | Logic, patterns, sequences, analogies |
| The Gauntlet | Rapid-fire aptitude & tech basics |
| The Forbidden Files | Ciphers, binary/hex/Morse, cyber-safety |
| The Vault | Roman numerals, primes, number locks |

Every team gets its own questions (no question repeats across teams), and never the same puzzle type twice in one arena.

### Crowd management (built in)

Teams are shuffled into 4 routes from a balanced Latin square — at every stage each arena hosts exactly one group (8 teams), every arena-to-arena walk is used by one group, and QR station = `(team index + arena) mod 3`, so each station serves 10–11 teams.

| Group | Route |
|---|---|
| 1 | Mind Maze → Gauntlet → Vault → Forbidden Files |
| 2 | Gauntlet → Forbidden Files → Mind Maze → Vault |
| 3 | Forbidden Files → Vault → Gauntlet → Mind Maze |
| 4 | Vault → Mind Maze → Forbidden Files → Gauntlet |

## Organiser panel (`/admin`)

- **Live** – teams signed in / travelling / solving / finished, crowd at each arena and station, every team's progress. Open or close logins here.
- **Team page** – route, all 16 questions with answers, activity log; check in without PIN, skip a question, ±1 min penalty, new password, reset.
- **Leaderboard** – finished teams by time (penalties included), then by progress.
- **QR codes** – 12 printable posters (one per page) and a test kit.
- **Setup** – when the clock starts (attendance or login), arena names/colours, import teams/questions (CSV), regenerate questions or QR codes, reset all progress.

## Tech stack

Next.js 15 (App Router, TypeScript) · Tailwind CSS · Prisma ORM · PostgreSQL on Supabase · `jose` signed cookies · `bcryptjs` · `html5-qrcode` (in-browser scanner) · `qrcode` (posters) · `papaparse` (CSV) · `lucide-react` icons.

## Run locally

```bash
npm install
cp .env.example .env        # fill in the Supabase connection strings + secrets
npm run db:push             # create tables in Supabase and lock them from the public API (RLS)
npm run dev                 # http://localhost:3000
```

> Phones only allow the camera on **HTTPS** (or localhost) — test scanning on the live URL. If the camera is unavailable, teams can type the short code printed under each QR.

## Scripts

| Command | What it does |
|---|---|
| `npx tsx --env-file=.env scripts/import-teams.ts <teams.json>` | Replace all teams with a registration list, draw routes, generate questions, write `credentials.csv` |
| `npx tsx --env-file=.env scripts/setup-arenas.ts` | Rename arenas, regenerate all questions, reset progress, open the event |
| `npx tsx --env-file=.env scripts/export-csv.ts` | Write `exports/questions.csv` and `exports/logins.csv` |
| `npm run qr:export -- <live-url>` | Write the 12 QR PNGs + testing guide to `qr-codes/` |
| `npx tsx --env-file=.env scripts/load-test.ts <live-url> 32 --phones=1 --burst` | Event rehearsal: every team plays the whole hunt at once; prints latency and resets all teams |

Files with passwords or answers (`credentials.csv`, `exports/`, `qr-codes/`, `prerequisites/`, `*.zip`, `.env`, `vercel.env`) are git-ignored — keep them private.

## Deploying (Vercel + Supabase)

1. Import the GitHub repo in Vercel (framework: Next.js). `vercel.json` pins the functions to `sin1`.
2. Environment variables (Vercel → Settings → Environment Variables):
   - `DATABASE_URL` – Supabase **Transaction pooler** string (port 6543) with `?pgbouncer=true`
   - `DIRECT_URL` – Supabase **Session pooler** string (port 5432)
   - `AUTH_SECRET` – a long random string
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ATTENDANCE_PIN`, `SHOW_STATION`, `WRONG_ANSWER_COOLDOWN`, `MCQ_LOCK_SECONDS` (default 45)
   - `PUBLIC_BASE_URL` – `https://treasure-hunt-nine-hazel.vercel.app` (encoded into QR posters)
3. The app keeps at most 2 database connections per server instance and releases idle ones, so it stays under Supabase's free-tier limit of 200 even when every team logs in at once.

The Supabase anon/publishable key is **not** used — all database access goes through Prisma on the server.

## Day-before checklist

1. Open Supabase to make sure the project isn't paused.
2. Change `ADMIN_PASSWORD` in Vercel.
3. Setup → **Reset all team progress**, then **Regenerate QR codes**, then print the posters.
4. Put up the posters and scan each one with a test device.
5. Sign in, label and charge all 32 devices; allow camera access.

## Project layout

```
app/
  login/, play/            team screens (login → attendance → travel → questions → finish)
  s/[token]/               landing page when a QR is scanned with the phone camera
  api/                     auth, state, attendance, scan, answer
  admin/(panel)/           live dashboard, team detail, leaderboard, QR posters, test kit, setup
lib/
  game.ts                  state machine: scan + answer logic (race-safe, idempotent answers)
  questions.ts             arena question generator (unique per team) + IEEE SB VU questions
  schedule.ts              Latin-square routes + QR station assignment
  setup.ts                 team building, question generation
  client-fetch.ts          phone-side timeout + retry
scripts/                   import, export, QR export, load test
prisma/schema.prisma
```
