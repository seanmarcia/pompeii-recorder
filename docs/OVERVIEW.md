# Food And Drink in Ancient Pompeii — Field Recorder: System Overview

A high-level assessment of what this application is, how it functions, and how it is deployed.

> **Project identity:** the live service is **fdpompeii.org** — the "Food And Drink in Ancient Pompeii" project. The same code also publishes a standalone demo of the field client to GitHub Pages.

---

## 1. What This Is

The **Pompeii Archaeological Field Recorder** is a field-data-capture and review system for archaeological work at Pompeii. It digitizes the paper "Pompeii Excavation Master Sheet" workflow:

1. **Field recorders** document rooms/features (spaces, walls, finds, photo/video logs) on a tablet or laptop. When the device has a connection (and the recorder is signed in), change requests push to the server in real time; when it doesn't, the app keeps working unconnected and queues changes to batch-sync later.
2. Recordings are submitted into a **review queue** — never directly into the master catalog.
3. **Researchers/admins** inspect each submission in a review portal — including a field-by-field diff against the existing master record — and can **correct fields inline** before deciding.
4. **Approving** a submission merges it into the **master catalog** (~4,959 feature records, ~5.9 MB of JSON); rejecting closes it with notes.
5. The master catalog can be exported or pulled by clients as a full snapshot.

The repo is a monorepo with two applications that communicate exclusively over HTTP/JSON:

| Side | Stack | Role |
|---|---|---|
| `backend/` | Ruby on Rails 8.1 (Ruby 4.0.5), SQLite | JSON API for the field client + server-rendered **Admin Review Portal** |
| `frontend/` | React 19 + Vite 8 SPA (plain JavaScript) | **Offline-first** field recording client used by archaeologists |

There is no shared code between the two. In production both are bundled into **one Docker image** (the SPA is built into the Rails app's `public/`), served from the same origin at fdpompeii.org.

---

## 2. Domain Model (3 tables + Active Storage)

| Model | Purpose | Key details |
|---|---|---|
| `Feature` | The **master catalog** — one row per master sheet ever recorded | Unique `sheet` number; ~30 fields mirroring the paper master sheet (`region`, `insula`, `entrance`, `recorder_id`, `season`, `description`, photo/video metadata…); photos stored as a JSON array in `photos_data` |
| `Submission` | The **review queue** — a proposed new feature or an update to an existing one | `payload_data` (JSON blob in the same schema as a Feature), `action_type` (`create_new` / `update_existing`), `status` (`pending` / `approved` / `rejected`), submitter & reviewer notes, `target_sheet`; photos via Active Storage attachments. Defines `EDITABLE_FIELDS` — the grouped, labelled whitelist reviewers may correct before approving |
| `User` | Accounts | `has_secure_password` (bcrypt); roles: `admin` / `recorder`; `full_name` with `display_name` fallback; login by username **or** email |

Conceptually: **Submissions are drafts; Features are truth.** A submission only ever becomes a Feature through explicit admin approval (after optional reviewer corrections).

---

## 3. The Backend (Rails 8.1)

Two faces, one app:

### 3.1 JSON API (`/api/v1`) — consumed by the React client

| Route | Purpose |
|---|---|
| `POST /api/v1/auth/login` | Validate credentials, return user info (no token/session issued) |
| `GET  /api/v1/features` | Full master catalog (optionally `?download=true` → file download) |
| `GET  /api/v1/features/:sheet` | One feature by sheet number |
| `POST /api/v1/submissions` | Queue a new submission (multipart: JSON payload + photo files) |
| `POST /api/v1/submissions/sync` | Bulk-sync an array of offline submissions in one transaction |
| `GET  /api/v1/submissions/:id` | Check a submission's review status |

CSRF verification is skipped on these controllers, and Rack::CORS allows all origins (`*`) so the separately-hosted SPA (GitHub Pages) can call the API. The API login validates credentials but issues **no bearer token** — submission endpoints are effectively open.

### 3.2 Admin Review Portal (server-rendered ERB, session auth)

| Route | Purpose |
|---|---|
| `GET/POST /admin/login`, `DELETE /admin/logout` | Session-based admin sign-in (redirects non-admins) |
| `GET /admin` | Review dashboard: pending/approved/rejected/all tabs with counts |
| `GET /admin/submissions/:id` | Submission detail with **computed diff** (old vs. new, per field, against the master record) |
| `PATCH /admin/submissions/:id` | **Inline reviewer corrections** — JSON endpoint that edits fields on a *pending* submission and returns re-rendered form rows |
| `POST /admin/submissions/:id/approve` | **Merge** payload into the `features` master table in a transaction |
| `POST /admin/submissions/:id/reject` | Mark rejected with reviewer notes |
| `GET /admin/export_master` | Download the entire master catalog as `features.json` |

Root (`/`) redirects to `/admin`. The `up` health check (`/up`) is used by the frontend to detect backend reachability.

### 3.3 The "Solid" stack — no external infrastructure

Rails 8.1's integrated stack is used deliberately: **SQLite for everything** (primary DB, plus `cache`, `queue`, and `cable` SQLite databases) and **Solid Cache / Solid Queue / Solid Cable** replace Redis/Memcached. Jobs run inside the Puma web process (`SOLID_QUEUE_IN_PUMA=true`). The deployable artifact is a single self-contained container.

### 3.4 Review logic (the heart of the system)

- `Submission#apply_reviewer_edits!` applies reviewer corrections to the payload — only fields the reviewer actually changed are added, so an untouched form never blanks out master values on approval.
- `Submission#approve!` runs in a transaction: find-or-initialize the `Feature` by sheet number, copy whitelisted fields from the payload, **merge photo lists** (existing + new, deduplicated), stamp the submission `approved` with reviewer notes and timestamp.
- `compute_diff` compares payload vs. master field-by-field (photos excluded) to render the admin diff view; `changed_field_count` drives the UI.

### 3.5 Users & seeding

`db/seeds/users.rb` creates a login for every project member (18 recorders + 3 researcher/admins), with usernames derived from full names. **Passwords come from encrypted Rails credentials, not the repo** (`seed_passwords:`), and the original shared demo accounts (whose passwords were published) are destroyed on seed. Roles are `recorder` (field app) and `admin` (also review portal).

### 3.6 Production hardening

`production.rb` forces SSL (with the `/up` exception), assumes the Kamal SSL proxy, locks `config.hosts` to `fdpompeii.org` / `www.fdpompeii.org`, and serves `public/` with `no-cache` (instead of 1-year caching) because it now hosts the SPA's `index.html` and service worker, which must update immediately on deploy.

---

## 4. The Frontend (React 19 + Vite SPA)

A deliberately dependency-light SPA (no router, no state library — plain React hooks + tabs). Views:

- **Login** — posts to the API when online; offline, it accepts **previously-remembered logins** (salted SHA-256 hashes stored after a successful online login) and any recorder via a **PBKDF2-hashed shared recorder password**. No plaintext credentials ship in the bundle.
- **Landing** — choose "new sheet" or "edit an existing sheet" (browse).
- **Form tab** — `RoomSelector` + `FeatureForm` (the full master-sheet form, with **controlled-vocabulary pickers** for feature types, space types, usage categories, and people) + `PhotoUploader` + `AttributeMultiSelect`. Selecting an existing room in Browse/RoomSelector **pre-fills the form with its current master values** and submits as `update_existing`; a blank start submits as `create_new`.
- **Browse tab** — browse/search the pulled master catalog.
- **Outbox tab** — inspect, retry, or discard queued offline submissions.

Auth state persists in `localStorage` (survives a full browser restart), and **form drafts** are saved to `localStorage` continuously so unsaved work survives reloads, browser closure, or the device sleeping mid-entry.

### 4.1 Offline-first data strategy (`src/lib/`)

- **`api.js`** — all network logic with automatic failover:
  - *Reads*: try `GET /api/v1/features` → on failure, `localStorage` cache → on failure, the **bundled `public/features.json`** (the full catalog ships inside the app). Health is re-checked every 10 s against `/up`; reconnect triggers a refresh.
  - *Writes*: connected → `POST /api/v1/submissions` immediately (real-time push); on failure (or no connection) **queue to the outbox** and batch-sync later instead of failing.
  - `BACKEND_URL` is `VITE_BACKEND_URL`; an **empty string means same-origin** (the fdpompeii.org build, where SPA and API are one site). Default for local dev: `http://localhost:3000`.
- **`storage.js`** — `localStorage` keys for the cached catalog, the offline outbox, **form drafts**, and the last submitter name; photos are held as base64 data URLs; emits a `pompeii_outbox_change` window event so the UI reacts.
- **`imageCompressor.js`** — every photo is drawn to a `<canvas>` and re-encoded as JPEG, iteratively reducing quality then dimensions until **strictly under 1 MB** (target 950 KB, max 2048 px).
- **`data/`** — the controlled vocabularies (feature types, space types, usage categories, late-usage, people) that power the form pickers; `people.js` must stay in sync with `backend/db/seeds/users.rb`.

### 4.2 Service worker (installable offline app)

`vite.config.js` includes a custom build plugin (`offlineServiceWorker`) that walks `dist/`, hashes every built file, and writes `sw.js` from `src/sw-template.js` with the full precache list baked in. In production builds the SW is registered (`main.jsx`), precaches the entire app on first visit, and serves it from cache when offline. API paths (`/api/`, `/admin`, `/up`) are always passed through to the network. The SPA is therefore usable **with zero connectivity after first load** — on GitHub Pages and on fdpompeii.org.

---

## 5. End-to-End Lifecycle

```
Field recorder                        Rails backend                     Reviewer
──────────────                        ─────────────                     ─────────
login ──────────────► /api/v1/auth/login
pull catalog ───────► /api/v1/features        (falls back to cache/bundled JSON)
record new sheet / edit existing room (draft autosaved locally)
       │ connected:  POST /api/v1/submissions (real-time) ─► Submission(status: pending)
       │ unconnected: localStorage outbox ── batch "Sync" later ─► same endpoint
                                                     ┌──────────────┐
                                        browse /admin │ pending queue│
                                                     └──────┬───────┘
                                            view diff (payload vs master)
                                            optionally correct fields (PATCH)
                                                     approve │ reject
                                                            ▼
                                              Feature master table updated
                                                            ▼
                                          clients pull refreshed catalog /
                                          admin exports features.json
```

---

## 6. How It Is Deployed

There are **two deployment modes** for the same frontend, plus one backend deployment:

### 6.1 Full stack — Kamal → fdpompeii.org

- **One image, both apps.** `backend/Dockerfile` builds from the **repo root**: a `node:24-slim` stage builds the SPA (`VITE_BASE=/ VITE_BACKEND_URL= npm run build` — empty backend URL = same-origin), and the output is copied into the Rails app's `public/`. The single container serves SPA + API + admin portal at **fdpompeii.org**.
- **Kamal** (`backend/config/deploy.yml`): service `fdpompeii`, image `ghcr.io/seanmarcia/fdpompeii`, one web server (`40.160.90.252`, user `ubuntu`), Let's Encrypt SSL proxy for `fdpompeii.org` + `www.fdpompeii.org`, `RAILS_MASTER_KEY` secret, persistent volume `fdpompeii_storage:/rails/storage` (SQLite DBs + Active Storage uploads), `SOLID_QUEUE_IN_PUMA=true`, asset-path bridging for zero-downtime deploys, and a remote builder on the server (amd64).
- **`backend/bin/deploy`** wraps it: rsync the source to the server, build the image there (reliable over flaky connections), push to GHCR, then `kamal deploy --skip-push`.
- Entrypoint runs `db:prepare` on boot; Thruster wraps Puma on port 80; the final image runs as a non-root `rails` user.

### 6.2 Frontend-only — GitHub Pages

- `.github/workflows/deploy.yml` (repo root) builds `frontend/` and publishes `dist/` to GitHub Pages on every push to `main` touching `frontend/**`.
- Vite `base` is `/pompeii-recorder/` (the Pages path); the fdpompeii.org build overrides with `VITE_BASE=/`. Built assets land in `field-assets/` to avoid clashing with Rails' own `/assets`.
- Without a backend, the Pages site runs in **demo/offline mode**: login falls back to offline credentials, the catalog falls back to the bundled snapshot, and submissions stay in the local outbox. Setting the `VITE_BACKEND_URL` repo secret (to an HTTPS backend — Pages is HTTPS-only) connects it to a real API.
- `frontend/DEPLOYMENT.md` documents the Pages setup in detail.

### 6.3 CI

- `backend/.github/workflows/ci.yml`: **Brakeman**, **bundler-audit**, **importmap audit**, **RuboCop** — on PRs and pushes to `main`. Dependabot is configured.
- Root `.github/workflows/deploy.yml` handles Pages deploys; backend deploys are manual via `bin/deploy`.

### 6.4 Local development

- Backend: `bin/rails db:prepare db:seed` then `bin/rails server` (SQLite in `storage/`; seeds require `seed_passwords` in credentials — see `db/seeds/users.rb`).
- Frontend: `npm install && npm run dev` (Vite dev server); expects the API at `http://localhost:3000` unless `VITE_BACKEND_URL` says otherwise.

---

## 7. Observations & Risks (high-level)

1. **Open CORS (`origins: "*"`) + unauthenticated submission endpoints** — anyone who can reach the API can queue (or bulk-sync) submissions; only the admin portal is protected by sessions. The GitHub Pages demo *depends* on open CORS, so tightening it (e.g. to specific origins) trades convenience for safety.
2. **Shared recorder password** — offline recorder login checks against a PBKDF2 hash of a shared password embedded in the client bundle; a shared secret is still recoverable by a determined attacker, and grants submission rights anywhere the API is reachable.
3. **No API tokens** — API login is one-time validation; the client keeps state in `localStorage`. There is no per-request auth on submission endpoints.
4. **localStorage as the offline store** — outbox, drafts, and catalog cache are per-browser and quota-bound, though photo-bloat is mitigated by the 1 MB compression rule and drafts degrade gracefully when storage is full.
5. **Seed passwords in credentials** — a good improvement over the original published demo passwords, but the credential file must be kept safe; re-seeding rotates everyone at once.

---

## 8. Key File Map

| Path | What it is |
|---|---|
| `backend/config/routes.rb` | All API + admin routes |
| `backend/app/models/feature.rb` | Master record; Pompeii JSON schema mapping |
| `backend/app/models/submission.rb` | Diffing, reviewer edits, approve!/reject! merge logic |
| `backend/app/models/user.rb` | Accounts; admin/recorder roles |
| `backend/app/controllers/api/v1/*` | JSON API for the field client |
| `backend/app/controllers/admin/*` | Review portal (session auth, inline edits, approve/reject/export) |
| `backend/app/views/admin/*` | ERB dashboard, diff view, `_field_row` partial for inline edits |
| `backend/db/features.json` | Full Pompeii dataset (~4,959 records) imported by seeds |
| `backend/db/seeds.rb` + `db/seeds/users.rb` | User seeding (credentials-based) + dataset import |
| `backend/Dockerfile` | Production image — builds the SPA and bundles it into Rails `public/` |
| `backend/config/deploy.yml` | Kamal deployment (fdpompeii.org, GHCR, SSL) |
| `backend/bin/deploy` | rsync → remote build → push → `kamal deploy --skip-push` |
| `backend/.github/workflows/ci.yml` | Security scans + lint CI |
| `frontend/src/App.jsx` | App shell: landing/form/browse/outbox tabs, sync orchestration |
| `frontend/src/lib/api.js` | Network layer with offline failover + outbox sync + offline login |
| `frontend/src/lib/storage.js` | localStorage: catalog cache, outbox, form drafts |
| `frontend/src/lib/imageCompressor.js` | <1 MB client-side photo compression |
| `frontend/src/data/*.js` | Controlled vocabularies for pickers; must match seed users |
| `frontend/src/sw-template.js` | Service worker template (precaches the whole app) |
| `frontend/vite.config.js` | `offlineServiceWorker` build plugin; Pages/production base paths |
| `frontend/src/components/*` | Login, landing, form, room selector, browse, outbox UI |
| `frontend/public/features.json` | Bundled catalog fallback (copy of dataset) |
| `.github/workflows/deploy.yml` | GitHub Pages deployment for the frontend |
| `frontend/DEPLOYMENT.md` | Pages deployment guide |
