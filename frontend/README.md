# Frontend — Pompeii Field Recorder (React + Vite)

The offline-first field client of the Pompeii Archaeological Field Recorder: login, master-sheet recording form with controlled-vocabulary pickers, catalog browse/search, offline outbox, and in-browser photo compression. For the system-level picture see the [root README](../README.md) and [docs/OVERVIEW.md](../docs/OVERVIEW.md).

## Requirements

- **Node 20+** (the Pages deploy workflow pins Node 20)

## Commands

```bash
npm install     # once
npm run dev     # dev server with HMR
npm run lint    # oxlint (JS/JSX lint)
npm run build   # production build → dist/
npm run preview # serve the production build locally
```

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:3000` | Where the Rails API lives. **Empty string = same-origin** (the fdpompeii.org build serves SPA and API from one site) |
| `VITE_BASE` | `/pompeii-recorder/` | Vite `base` — the GitHub Pages path; the fdpompeii.org Docker build sets `VITE_BASE=/` |

## How it behaves offline

- **Reads** fall back: live API → localStorage cache → the bundled `public/features.json` snapshot (the full catalog ships with the app).
- **Writes** are connection-dependent: connected (and signed in) → submitted in real time; unconnected → queued in a localStorage **outbox** and batch-synced when connectivity returns. Unfinished forms autosave as **drafts**.
- A build-time **service worker** (`src/sw-template.js` + the `offlineServiceWorker` plugin in `vite.config.js`) precaches every built file, so the production app opens with zero connectivity after first visit. API paths (`/api/`, `/admin`, `/up`) always pass through to the network.
- Photos are compressed in-browser to strictly < 1 MB (`src/lib/imageCompressor.js`) before storage or upload.
- Offline login works without a connection: remembered logins (salted SHA-256 hashes) and recorders via a PBKDF2-checked shared password. No plaintext credentials ship in the bundle.

## Conventions

- `src/data/*.js` are the controlled vocabularies behind the form pickers. **`people.js` must stay in sync with `backend/db/seeds/users.rb`** — same people, usernames derived the same way.
- By design there is no router or state library — `App.jsx` drives the landing/form/browse/outbox tabs with plain React hooks.
- Built assets land in `field-assets/` (not `/assets`) to avoid clashing with the Rails backend's own asset path.

## Tests

There is no automated test suite for the frontend yet — `npm run lint` (oxlint) is the only check. The backend's checks are documented in [backend/README.md](../backend/README.md).

## Deployment

- **fdpompeii.org:** bundled into the backend Docker image (see [backend/README.md](../backend/README.md)).
- **GitHub Pages:** automatic via the root `.github/workflows/deploy.yml` on pushes to `main` touching `frontend/**`. Full guide in [DEPLOYMENT.md](DEPLOYMENT.md).
