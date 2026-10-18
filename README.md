# Pompeii Archaeological Field Recorder

Field data capture and expert review for the **Food And Drink in Ancient Pompeii** project ([fdpompeii.org](https://fdpompeii.org)). It digitizes the paper "Pompeii Excavation Master Sheet" workflow: archaeologists record rooms and features offline in the field, submissions flow into a review queue, and researchers approve, correct, or reject each one before it merges into the master catalog.

> **Note for humans and AI agents:** the nested `backend/README.md` and `frontend/README.md` are framework boilerplate. This file and [`docs/OVERVIEW.md`](docs/OVERVIEW.md) are the authoritative documentation.

## The 30-second version

1. A **recorder** signs into the field app (browser/tablet, works fully offline) and fills out a master sheet for a room — description, types, relationships, photos.
2. Online, the sheet is submitted to a review queue. Offline, it waits in a local **outbox** and syncs later. Unfinished work is saved as a **draft** automatically.
3. A **researcher/admin** opens the review portal, sees a field-by-field **diff** against the existing master record, can **correct fields inline**, then approves or rejects.
4. Approval merges the submission into the **master catalog** (~4,959 features). Clients re-pull the catalog; admins can export it as JSON anytime.

**Core rule:** *submissions are drafts, features are truth.* Nothing enters the master catalog without an explicit approval.

## The approval workflow

Every change to the master catalog goes through the same loop: **record → submit → review → merge (or reject)**. Each submission carries an `action_type` — `create_new` or `update_existing` — so reviewers always know which kind of change they are looking at.

**Recording a new sheet.** From the field app's landing screen the recorder starts a blank master sheet, fills it in (pickers enforce the project's controlled vocabularies), attaches photos, and submits.

**Editing an existing sheet.** The recorder opens **Browse**, searches the catalog (works offline from the cached/bundled snapshot), and selects the room. The form **pre-fills with the room's current master values**; the recorder updates what they observed and submits. The submission targets that sheet number (`target_sheet`), so reviewers see the proposed change *against the live master record* — never a blind overwrite.

**Submitting (online or off).** With the backend reachable the submission is queued immediately; otherwise it waits in the local **outbox** and syncs later (individually or via the bulk sync endpoint). The recorder can later check what happened to a submission via `GET /api/v1/submissions/:id`.

**Review.** An investigator/admin opens the review portal (`/admin`):
- The dashboard lists the pending queue, plus approved/rejected history.
- Opening a submission shows a **field-by-field diff** — master value vs. submitted value — highlighting only the fields that would change.
- The reviewer can **correct fields inline** before deciding (`PATCH /admin/submissions/:id`, pending submissions only). Corrections equal to the master value are never written, so an untouched form cannot silently blank out master data.
- **Approve** merges the payload into the master catalog inside a transaction — creating the feature or updating the existing one by sheet number, *merging* (not replacing) photo lists, and stamping reviewer notes + timestamp.
- **Reject** closes the submission with reviewer notes; the master record is never touched without an approval.

**After a decision.** Approved changes are live in the catalog: field clients pick them up on the next catalog pull/sync, and admins can export the whole catalog as JSON (`GET /admin/export_master`).

## Repository layout

```
backend/    Rails 8.1 (Ruby 4.0.5) — JSON API (/api/v1) + server-rendered review portal (/admin)
frontend/   React 19 + Vite 8 SPA — offline-first field client
docs/       System overview (deep dive): OVERVIEW.md + overview.html
```

The two apps share no code and talk over HTTP/JSON. In production they ship **inside one Docker image** and are served from the same origin at fdpompeii.org.

## Architecture

```
┌─────────────────────────┐         ┌──────────────────────────────────────┐
│ Field Client (SPA)      │  JSON   │ Rails 8.1 (single container)         │
│  React 19 + Vite 8      │◄───────►│                                      │
│  ─ service worker       │  same-   │  /api/v1   auth · features ·        │
│    precaches whole app  │  origin  │             submissions (+ bulk)    │
│  ─ localStorage: catalog│  or CORS │  /admin     review portal (session  │
│    cache · outbox ·     │          │             auth): diffs, inline    │
│    form drafts          │          │             edits, approve/reject   │
└─────────────────────────┘         │  SQLite (primary + cache + queue    │
┌─────────────────────────┐  HTML   │           + cable) — Solid stack,    │
│ Review Portal (browser) │◄───────► │           jobs run inside Puma       │
│  session auth, admin    │          │  Active Storage photos (disk)       │
└─────────────────────────┘         └──────────────────────────────────────┘
```

- **Backend:** Rails 8.1 omakase stack — SQLite for everything, Solid Cache/Queue/Cable (no Redis), Puma + Thruster, Propshaft. Deployment via Kamal + Docker.
- **Frontend:** dependency-light React SPA (no router/state lib), a build-time service worker that precaches the entire app, and controlled-vocabulary pickers backed by `frontend/src/data/`.

## HTTP surfaces

**Field API** (`/api/v1`, CSRF-skipped, CORS-open — consumed by the SPA):

| Route | Purpose |
|---|---|
| `POST /auth/login` | Validate credentials → user info (no token issued) |
| `GET /features` | Full master catalog (`?download=true` → file) |
| `GET /features/:sheet` | One feature by sheet number |
| `POST /submissions` | Queue a submission (JSON payload + photos) |
| `POST /submissions/sync` | Bulk-sync offline outbox batches |
| `GET /submissions/:id` | Check review status |

**Review portal** (`/admin`, session-authenticated, admins only): queue dashboard, submission diff view, `PATCH /admin/submissions/:id` for inline field corrections, `approve`/`reject` actions, `GET /admin/export_master`.

## Domain model

| Model | Role |
|---|---|
| `Feature` | Master catalog record; unique `sheet` number; ~30 paper-sheet fields; photos as JSON |
| `Submission` | Pending change to the catalog; `payload_data` JSON mirrors Feature schema; `pending → approved/rejected`; reviewer-editable field whitelist |
| `User` | bcrypt accounts; roles `admin` / `recorder`; seeded from encrypted credentials (never the repo) |

## Offline-first design (frontend)

- **Reads:** live API → localStorage cache → bundled `public/features.json` snapshot (full catalog ships with the app).
- **Writes:** online → POST; offline → localStorage outbox, synced on demand. Drafts autosave so work survives reloads and device sleep.
- **Photos:** compressed in-browser (canvas) to strictly < 1 MB before storage or upload.
- **Login offline:** remembered logins (salted SHA-256 hashes) and recorders via a PBKDF2-checked shared password — no plaintext credentials in the bundle.
- **Service worker:** a Vite plugin bakes the full precache list into `sw.js` at build time; the app opens with zero connectivity after first visit.

## Local development

**Backend** (needs Ruby 4.0.5):

```bash
cd backend
bin/rails db:prepare            # SQLite lives in storage/
bin/rails server                # http://localhost:3000
```

Seeding (`bin/rails db:seed`) imports the full dataset from `db/features.json` and creates logins for every project member — it requires `seed_passwords` in the encrypted Rails credentials (see `db/seeds/users.rb`); ask a project member, or develop against an empty catalog.

**Frontend** (needs Node 20+):

```bash
cd frontend
npm install
npm run dev                     # expects the API at http://localhost:3000
```

Override the API location with `VITE_BACKEND_URL` (empty string = same-origin).

**Tests/lint:** `bin/rails test` (backend, controller tests for API + admin), `bin/rubocop`, `bin/brakeman` (backend), `npm run lint` (frontend, oxlint).

## Deployment

| Target | How | What |
|---|---|---|
| **fdpompeii.org** | `backend/bin/deploy` (manual): rsync source → build image on the server → push to `ghcr.io/seanmarcia/fdpompeii` → `kamal deploy --skip-push` | One Kamal-managed container serving SPA + API + portal; Let's Encrypt SSL; SQLite + uploads on the `fdpompeii_storage` volume |
| **GitHub Pages** | Automatic on push to `main` touching `frontend/**` (`.github/workflows/deploy.yml`) | Standalone SPA demo at `<user>.github.io/pompeii-recorder/` — bundled catalog, offline login, outbox-only. Connect a real backend by setting the `VITE_BACKEND_URL` repo secret (HTTPS only). See `frontend/DEPLOYMENT.md` |

The Dockerfile builds from the **repo root**: a Node stage builds the SPA (`VITE_BASE=/`, same-origin API) into the Rails app's `public/`. Production Rails forces SSL, pins `config.hosts` to fdpompeii.org, and serves `public/` with `no-cache` so the SPA shell and service worker update immediately.

CI (`backend/.github/workflows/ci.yml`): Brakeman, bundler-audit, importmap audit, RuboCop on PRs and `main`.

## Repo map

Quick orientation for agents (and humans):

| Path | What it is |
|---|---|
| `backend/config/routes.rb` | Every route |
| `backend/app/models/submission.rb` | Diff, reviewer edits, approval merge — the heart of the review workflow |
| `backend/app/models/feature.rb` | Master record + Pompeii JSON schema mapping |
| `backend/app/controllers/api/v1/` | Field client API |
| `backend/app/controllers/admin/` | Review portal controllers |
| `backend/app/views/admin/` | ERB review UI (incl. `_field_row` partial for inline edits) |
| `backend/db/features.json` | Full dataset (~4,959 records), imported by seeds |
| `backend/db/seeds/users.rb` | Project logins (passwords from credentials) |
| `backend/Dockerfile`, `backend/config/deploy.yml`, `backend/bin/deploy` | Image + Kamal deploy to fdpompeii.org |
| `frontend/src/App.jsx` | SPA shell, tabs, sync orchestration |
| `frontend/src/lib/api.js` | Network layer: offline failover, outbox sync, offline login |
| `frontend/src/lib/storage.js` | localStorage: catalog cache, outbox, drafts |
| `frontend/src/lib/imageCompressor.js` | < 1 MB photo compression |
| `frontend/src/data/` | Picker vocabularies — keep in sync with `seeds/users.rb` |
| `frontend/src/sw-template.js`, `frontend/vite.config.js` | Service worker + the build plugin that generates it |
| `.github/workflows/deploy.yml` | GitHub Pages deployment |

## Further reading

- [`docs/OVERVIEW.md`](docs/OVERVIEW.md) — full system deep-dive (updated per release)
- [`docs/overview.html`](docs/overview.html) — the same overview as a visual one-pager
- [`frontend/DEPLOYMENT.md`](frontend/DEPLOYMENT.md) — GitHub Pages setup and backend connectivity
