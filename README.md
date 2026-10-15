# The Hunt — Treasure Hunt Web App

A mobile-first web app for a 30-team, 4-track treasure hunt with QR check-points, per-team questions, a server-side clock and a live organiser dashboard.

## How the game works

1. **Login** – each team signs in with its team code and password (every member can sign in on their own phone, progress syncs).
   The clock starts here (or at attendance – see `TIMER_START`).
2. **Attendance** – the 3 members are listed; the team taps who's present and a volunteer enters the PIN.
3. **Tracks** – each team visits the 4 tracks in its own order. At each track it must scan **its** QR station (A/B/C):
   - wrong track → *"Incorrect track"*
   - right track, wrong station → *"Right track, wrong QR code — find station B"*
   - correct → 4 questions unlock, one at a time.
4. **Question 4** is a riddle that leads to the team's next track. On the last track, Q4 is the **final question** — answering it stops the clock.

### Crowd management (built in)

Teams are shuffled and dealt into 4 routes from a balanced Latin square:

| Group | Route |
|---|---|
| 1 | 1 → 2 → 4 → 3 |
| 2 | 2 → 3 → 1 → 4 |
| 3 | 3 → 4 → 2 → 1 |
| 4 | 4 → 1 → 3 → 2 |

- At every stage each track hosts exactly one group (7–8 teams).
- Every track-to-track walk is used by only one group.
- QR station = `(team index + track) mod 3` → exactly **10 teams per station**, and simultaneous arrivals spread ~3/3/2.

## Tech stack

Next.js 15 (App Router, TypeScript) · Tailwind CSS · Prisma ORM · PostgreSQL on Supabase · `jose` signed cookies · `bcryptjs` · `html5-qrcode` (in-browser scanner) · `qrcode` (posters) · `papaparse` (CSV import/export) · `lucide-react` icons.

## Run locally

```bash
npm install
cp .env.example .env        # fill in the Supabase connection strings + secrets
npm run db:push             # create tables in Supabase and lock them from the public API (RLS)
npm run db:seed             # 30 demo teams + 480 placeholder questions → credentials.csv
npm run dev                 # http://localhost:3000
```

- Team login: `TEAM01` / `demo123` (all other passwords are in `credentials.csv`).
- Organiser panel: `/admin` (username/password from `.env`). Press **Open event** before teams can sign in.

> Phones only allow the camera on **HTTPS** (or localhost). Test scanning on the Vercel URL. If the camera is unavailable, teams can type the short code printed under each QR.

## Preparing the real event

1. **Setup → Tracks**: rename the 4 tracks, add location hints and colours.
2. **Setup → Import teams**: upload `teams.csv` (template in `public/templates/teams.csv`, one row per member). This draws a fresh balanced schedule. Download the generated `credentials.csv`.
3. **Setup → Download pre-filled sheet**: you get all 480 rows (`team_code, track, slot, …`) with a note on each slot-4 row saying which track that riddle must lead to. Write your questions/answers, then **Import questions**. Separate alternative answers with `|` (e.g. `Library|The Library`). Matching ignores case, spaces and punctuation.
4. **QR codes**: set `PUBLIC_BASE_URL` to your live URL, then print the 12 posters (one per page).
5. Do a dry run with 2–3 test teams, then **Setup → Reset all team progress**.
6. On the day: **Open event** on the dashboard and hand out credentials.

## Deploying (Vercel + Supabase)

1. Import the GitHub repo in Vercel (framework: Next.js, defaults are fine).
2. Add these environment variables in Vercel → Settings → Environment Variables:
   - `DATABASE_URL` – Supabase **Transaction pooler** string (port 6543) with `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` – Supabase **Session pooler** string (port 5432)
   - `AUTH_SECRET` – a long random string
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ATTENDANCE_PIN`, `TIMER_START`, `SHOW_STATION`, `WRONG_ANSWER_COOLDOWN`
   - `PUBLIC_BASE_URL` – your Vercel URL, e.g. `https://treasure-hunt.vercel.app` (used in QR posters)
3. Deploy. The database is already created and seeded from your machine (`npm run db:push && npm run db:seed`).

The Supabase anon/publishable key is **not** used by this app — all access goes through Prisma on the server.

## Configuration (`.env`)

| Variable | Meaning |
|---|---|
| `ATTENDANCE_PIN` | Volunteer PIN for check-in (empty = no PIN) |
| `TIMER_START` | `login` or `attendance` |
| `SHOW_STATION` | `true` shows teams their QR station letter; `false` keeps it hidden |
| `WRONG_ANSWER_COOLDOWN` | Seconds to wait after a wrong answer |
| `PUBLIC_BASE_URL` | URL encoded into the QR posters |

## Project layout

```
app/
  login/, play/            team screens (login → attendance → travel → questions → finish)
  s/[token]/               landing page when a QR is scanned with the phone camera
  api/                     auth, state, attendance, scan, answer
  admin/(panel)/           live dashboard, team detail, leaderboard, QR posters, setup
lib/
  game.ts                  state machine: scan + answer logic (race-safe for multiple phones)
  schedule.ts              Latin-square routes + QR station assignment
  setup.ts                 team building, placeholder questions
prisma/schema.prisma, seed.ts
```
