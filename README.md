# NHF website and Match Centre

The Nigeria Hockey Federation website, built from the approved v4 prototype, with the Match Centre as a section of it. One website, one database, one staff sign-in:

- **The website:** home, news, national teams, stats and records, how hockey works, the Super League, gallery, about, get started, and the planned pages from the roadmap.
- **The Match Centre** at `/match-centre`: live scores, fixtures, tables, clubs, and every player's goals across the clubs they have played for.
- **The admin** at `/admin` for news, seasons, venues, competitions, results, clubs and crests, players and headshots, registrations and transfers. The **live scorer** at `/score/[id]` is for use at pitch side.

Built with **Next.js 15 (App Router) + TypeScript**, **PostgreSQL 15+** and the `postgres` driver. No CSS framework: the stylesheet is the prototype's own.

## Put it online, with nothing installed

Everything happens in the browser: GitHub holds the code, Render builds and runs it.

1. **GitHub:** create a private repository (github.com → New repository), then choose “uploading an existing file” and drag the files in. GitHub takes 100 files at a time, so upload in two goes:
   - first, everything except the `src/app` folder (72 files);
   - then open the `src` folder on GitHub, choose **Add file → Upload files**, and drag the `app` folder in (77 files), so it lands at `src/app`.
2. **Render:** at render.com, sign in with GitHub, then **New → Blueprint** and choose the repository. `render.yaml` describes the website and its PostgreSQL database, both in Frankfurt.
   - When Render asks for `NHF_SETUP_CODE`, choose a private phrase and keep it.
   - **For a trial before approval,** set **Blueprint Path** to `render-trial.yaml` instead. It uses the free plans and invented Match Centre data, shows “Trial copy” on every page, and keeps out of search engines. Render deletes a free database after 30 days, so the live site starts fresh from `render.yaml`.
3. **Wait for the first deploy.** When the site starts, it creates its own database tables and loads the news stories. Nothing needs to be run by hand.
4. **Open `/setup`** on the new site. It shows that the database is ready. Enter the setup code, your name, email address and a password: that makes the first administrator account and signs you in.
5. **Follow the checklist** on the admin dashboard: the current season, venues, clubs with their crests, staff accounts, the first competition.

`/api/health` answers `"ok": true` once the database is reachable and up to date. Render uses it to tell whether a deploy worked.

### Or on Vercel and Neon, with no card

For a trial, Vercel (website) and Neon (database) both have free plans that need no card:

1. **Neon** (neon.com): sign up with GitHub and create a project called `nhf` in a European region. Copy the connection string with **connection pooling turned off** (no `-pooler` in it).
2. **Vercel** (vercel.com): sign up with GitHub, choose **Add New → Project** and import this repository. Before deploying, add these under **Environment Variables**, then click **Deploy**:
   - `DATABASE_URL`: the Neon string;
   - `NHF_SETUP_CODE`: a phrase you choose;
   - `NHF_DEMO_DATA=true` for a trial copy.
3. Open `/api/health`, then `/setup`, as above.

On Vercel, live match pages refresh every 20 seconds instead of updating instantly, because Vercel cuts long-lived connections. Vercel's free Hobby plan is for non-commercial use, so the live site belongs on a paid plan: Vercel Pro, or Render from `render.yaml`.

Other hosts work the same way: a Node 20+ server running `npm install && npm run build`, then `npm start`, with `DATABASE_URL` pointing at an empty PostgreSQL database.

## On a developer's computer

```bash
createdb nhf
cp .env.example .env.local        # set DATABASE_URL
npm install
npm run dev                       # http://localhost:3000; the database sets itself up on start
```

Then open `/setup`, or try the Match Centre with invented data first:

```bash
NHF_DEMO_DATA=true npm run dev    # on an empty database: invented clubs, players and results
npm test                          # library tests (fixtures, CSV, tally)
npm run db:test                   # db/tests.sql: 62 checks, rolled back afterwards (needs the demo data)
```

The older psql scripts still work for people who prefer them: `npm run db:load`, `db:content` and `db:seed`. Loaded this way, the demo data includes a sample administrator, `admin@example.org` with the password `change-me-now`. When the site loads the demo data itself, that account is switched off.

## Settings

| Variable | What it does |
|---|---|
| `DATABASE_URL` | The PostgreSQL connection string. An empty database is fine. Use a direct connection, not a pooled one: live scores use `LISTEN`. |
| `NHF_SETUP_CODE` | The code `/setup` asks for before the first administrator is created. If it is not set, the site writes a new code to its log on every start, on a line beginning `[nhf] No administrator yet`. |
| `SITE_URL` | The site's public address once the domain is connected, for links and share text. Until then the site uses the address Render gives it. |
| `NHF_AUTO_MIGRATE` | `false` to stop the site setting up its own database. |
| `NHF_DEMO_DATA` | `true` adds invented clubs, players and results, but only to an empty database. It also shows “Trial copy” on every page and keeps the site out of search engines. Never on the live site. |
| `PUBLIC_FULL_NAMES_UNDER_18` | `true` shows full names of under-18s. By default they appear as first name and last initial. |
| `DATABASE_POOL_SIZE` | Connections per server process (default 10). |

## How the database is kept up to date

The site applies the files in `db/` when it starts (`src/instrumentation.ts`, `src/lib/migrate.ts`):

- Each file runs once, in order, inside a single transaction, and is recorded in `schema_migrations`. If one fails, nothing from it is kept and the log says why.
- When several servers start at once, a lock makes them take turns.
- A database loaded by hand with psql is recognised: files whose tables are already there are recorded as found, not run again.
- Any future change to the database goes in a new file at the end of the list in `src/lib/migrate.ts`.
- `npm run db:migrate` does the same without starting the site.

| File | Contents |
|---|---|
| `001_schema.sql` | Tables: clubs, teams, players, registrations, seasons, venues, competitions, matches, events, users |
| `002_logic.sql` | Rules (triggers), statistics views, search, standings |
| `004_site.sql` | News, uploaded photos, newsletter sign-ups |
| `005_site_content.sql` | The news stories from the prototype, with sources |
| `006_setup.sql` | Settings for first-time setup |
| `007_people_media.sql` | Headshot and crest checks, and the rule for headshots of under-18s |
| `003_demo_seed.sql` | Invented demo data, only with `NHF_DEMO_DATA=true` on an empty database |

Back up the database daily. Uploaded photos, headshots and crests are stored in it, so the backup includes them. The `audit_log` table records who changed what.

## What is where

| Address | What it is | Data |
|---|---|---|
| `/` | Home | Lead story, news grid with agenda, more news, the Match Centre band (today, latest results, top scorers), This is hockey, Team Nigeria, Super League, get involved, newsletter |
| `/news`, `/news/[slug]` | News | Database, written in Admin → News |
| `/national-teams`, `/national-teams/men` (`women`, `u18`) | National teams | `src/content/national.ts` |
| `/stats` | FIH rankings, honours, results, and domestic leaders this season | Rankings from `national.ts`; leaders live from the Match Centre |
| `/how-hockey-works` | The scroll story on an animated pitch, the cards, kit, Hockey5s, glossary | `src/content/story.ts` |
| `/super-league` | The league, 2025 finals and 2026 reports, and live Super League competitions | `superleague.ts` and the database |
| `/gallery`, `/about`, `/get-involved` | As in the prototype | `photos.ts`; gallery also includes photos from news stories |
| `/coaching`, `/umpiring`, `/regulations`, and the others | Planned pages, each listing what it will hold | `src/content/pages.ts` (34 pages) |
| `/match-centre` | Live and today, latest results, top scorers, coming up, competitions | Database |
| `/match-centre/competitions/[slug]` | Tables with form, qualifying places, classification bracket, fixtures, scorers, cards | Database |
| `/match-centre/matches/[id]` | Live scoreboard, goals by quarter, match protocol, line-ups | Database, updated live |
| `/match-centre/clubs/[slug]` | Crest, squads by season with headshots, results, everyone who has played for the club | Database |
| `/match-centre/players`, `/match-centre/players/[id]` | Search by name, NHF number, season, club, category; headshot and career across clubs | Database |
| `/setup` | First-time setup: database check and the first administrator | Database |
| `/api/health` | Is the database reachable and up to date | Database |

Every page has the same menus, the live score strip under the masthead (refreshed every 30 seconds while a match is live), and search. Search covers pages, news, competitions, clubs and players; press `/` to open it. The floating search bar does not appear in the Match Centre, and moves out of the way of tables, forms and articles.

## Editing the site

- **News** (`/admin/news`, for the media role and administrators):
  - Each story has a headline, summary, text, date, tags, photo upload (JPEG, PNG or WebP up to 6 MB, checked by its content, not its name), photo description and credit, and sources.
  - A story can be marked as the **home page lead**, with a short headline (`Double *bronze* in Nairobi` colours the starred word) and highlight chips.
  - Drafts and stories dated in the future stay hidden until they are published and their day comes.
  - A story without a photo gets artwork that suits it: medals, a cup, rising bars, or a stick and ball.
- **Seasons** (`/admin/seasons`) and **venues** (`/admin/venues`), for competition managers and registrars:
  - Add, rename or re-date a season, and choose which one is current.
  - Add or edit a pitch.
  - Seasons and venues that are in use cannot be deleted, so history stays intact.
- **Club crests** (Admin → Clubs → a club): a square PNG, JPEG or WebP up to 2 MB. It replaces the coloured circle on the club's page, in tables and on match cards.
- **Player headshots** (Admin → Players → a player): an upright photo up to 3 MB.
  - For a player under 18, or with no date of birth on record, the admin asks for the date a parent or guardian gave consent first.
  - If consent is later removed, the photo stays in the admin but disappears from public pages (`public_photo()` in `007_people_media.sql`).
- **Newsletter sign-ups** are stored in `newsletter_signups`, and the count shows on the News admin page. Sending is not built in: export the list to your mailing tool.
- **Everything else on the website** is in `src/content/*.ts` and `public/img`. That covers the national team results and rankings, Super League facts, photos for each page section, the menus and the planned pages.

## Design rules kept in the stylesheet

The stylesheet (`src/app/site.css`) keeps the prototype's look, with these rules for reading and use on phones:

- **Type:**
  - Body text is 16px, and nothing is smaller than 12px. Table headers are 13px.
  - Anton capitals are kept for short labels and section names. Headlines that are sentences (news, articles, the promo) are in sentence case (`.sentence`).
  - Team names in the agenda are in Barlow.
- **Touch:** on phones and touch screens, every button, pill and link outside running text is at least 44px tall. Links in tables get a larger hit area without changing the row height.
- **Colour:**
  - About 60% neutral (white and light grey), 30% green (dark bands, header, footer), 10% yellow (one promo, numbers, one button).
  - Text meets 4.5:1. Yellow text appears only on dark green. Links on tinted backgrounds use the darker `--link` green.
  - Form fields have a 3:1 border (`--field-line`).
- **Cards:** green, yellow and red cards carry their letter (G, Y, R) and an outline, so they do not rely on colour.
- **Hero:** the story sits on solid green in the left third, with the photo across the right two-thirds. On phones, the photo comes first and the story below it, so text never sits on faces.
- **Home page:** full-width bands alternate light and dark. The dark bands are the hero, This is hockey and the get-involved block, so no two dark bands sit next to each other.
- **Results:** results are grouped under their competition. An unconfirmed result has a small ring by the score, explained once under the list.

## The Match Centre data model

```
clubs ─┬─ teams (one per category: men, women, boys/girls U18, U21)
       │     │
players ─── registrations (player × team × season, joined_on / left_on, approved)
                 │
matches ─── match_squads (who played: the players tally; each row points at the registration)
        └── match_events (goals FG/PC/PS and cards; voided, never deleted)
```

- **A player and a club are separate.** A player joins a club's team for a season through a registration. A transfer ends one registration the day before and starts another. Goals and appearances stay with the club where they happened, and the player's career adds up across clubs.
- **Every statistic is derived** from `match_squads` and `match_events` by the views in `db/002_logic.sql`. The match score is the count of goal events; nobody types it twice.
- **The database enforces the rules**, whichever screen or import the data comes through:
  - a player can only be on a team sheet with an approved registration for that team on the match date (Nigerian time);
  - a goal or card must belong to someone on the team sheet;
  - one active registration per player per category per season, and unique shirt numbers;
  - gender and youth age limits by category;
  - at most one red card per player per match;
  - a registration that has appearances cannot be rejected, moved, or closed before its last match;
  - knockout results need a shoot-out when level.
- **Classification fills itself in.** Matches can name their teams by slot until they are known:
  - `A1` is the winner of group A;
  - `L3` is 3rd in the league;
  - `W:SF1` / `L:SF1` is the winner or loser of SF1.

  When results are final, the database fills in the teams of classification matches that have not started.
- **Two-step results.** A result from the live scorer shows straight away but is marked unconfirmed until a competition manager checks it against the scoresheet.

## Roles

| Role | Can |
|---|---|
| Administrator | Everything, including users |
| Competition manager | Seasons, venues, competitions, fixtures, results, confirmation |
| Registrar | Seasons, venues, clubs and crests, players and headshots, registrations, transfers |
| Scorer | Live scoring of assigned matches (or any match with no assigned scorer), and result entry |
| Media | News; sees unpublished competitions |

## Live updates and hosting

The database sends `NOTIFY match_live` on every match change. The site holds one `LISTEN` connection per server process and streams updates to open match pages (`/api/live/[id]`).

This needs a **long-running Node server**, which is what `render.yaml` sets up. On serverless hosts, the match page falls back to polling every 20 seconds. Put Cloudflare in front for speed in Nigeria if traffic grows.

## Tests

| What | Command | Covers |
|---|---|---|
| Database | `npm run db:test` | 62 checks: totals add up, transfers, eligibility by date, the tally rules, live scoring, classification with shoot-outs, search by season and club, notifications |
| Libraries | `npm test` | 23 tests: fixture generation, slot checks, CSV parsing and validation, tally validation |

**Before launch**, the first build on Render (`npm install && npm run build`) type-checks against the real Next.js and React types. This code was checked in a sandbox where those packages could not be installed:

- It was type-checked against stand-in types.
- Its queries and server actions ran against PostgreSQL 16 in 150 end-to-end checks.
- The self-setup ran 57 checks on an empty database, on one loaded with psql, and with demo data.
- Every page was rendered to HTML and measured at phone width for text size, tap targets, contrast and overflow.

## Decisions for the NHF to confirm

- **Youth age cut-off:** players must be under 18 (or 21) on 1 January of the season year. To change it, edit `category_age_limit` in `db/002_logic.sql`.
- **Table tie-breaks:** points, then goal difference, then goals scored. Change `group_standings` if NHF regulations follow another order.
- **Youth names and photos in public:**
  - Under-18s show as first name and last initial, and dates of birth are never public.
  - Their headshots appear only with a guardian's consent date.
  - Set `PUBLIC_FULL_NAMES_UNDER_18=true` to show full names.
- **NHF numbers:** new players get `NHF-30001` upwards (`nhf_number_seq` in `db/001_schema.sql`).
- **Squad size:** at most 18 per team sheet (`maxSquad` in `src/lib/tally.ts`).
- **Board names and the federation's email** come from the FIH profile and the 2026 leadership list. Confirm them before launch (`src/app/(site)/about/page.tsx`).
- **File photo:** the African Games story uses the women's squad photo as a file photo; its credit is still to confirm (`src/content/photos.ts`).

## Layout

```
db/              schema, rules and views, website tables, content, setup, headshots and crests, demo data, tests
public/img       photos used on the website
render.yaml      hosting on Render: the website and its database (render-trial.yaml: free trial copy)
src/instrumentation.ts   on start: bring the database up to date, prepare the setup code
src/content/     menus, national teams, Super League, photos, story steps, planned pages
src/lib/         migrate.ts, images.ts, competition.ts, csv.ts, tally.ts, queries.ts, news.ts, admin-queries.ts, auth.ts, db.ts, live.ts, format.ts
src/app/site.css the prototype's stylesheet with the design rules above; mc.css adds the admin, scorer and editor
src/app/(site)/  every public page, including match-centre/…
src/app/admin/   admin: news, seasons, venues, competitions, clubs, players, registrations, users
src/app/setup/   first-time setup
src/app/score/   live scorer
src/app/api/     live (SSE), today (strip), search, health
src/app/media/   uploaded photos, headshots and crests
src/components/  masthead, search, strip, photo, match cards, card icons, tables, pitch story, gallery
tests/           library tests (node:test, run with tsx)
scripts/         migrate.ts, hash-password.ts
```
