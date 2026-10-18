# Backend — Pompeii Field Recorder (Rails)

The Rails side of the Pompeii Archaeological Field Recorder: the JSON API for the field client (`/api/v1`), the admin review portal (`/admin`), and the master catalog. For the system-level picture see the [root README](../README.md) and [docs/OVERVIEW.md](../docs/OVERVIEW.md).

## Requirements

- **Ruby 4.0.5** (see `.ruby-version`; later 4.0.x works fine locally)
- **SQLite 3** — the only database; all files live in `storage/`

## Setup

```bash
bin/setup --skip-server   # install gems + prepare databases
bin/rails db:prepare      # (same database step on its own)
```

Plain `bin/setup` does the same and then starts the dev server. Production uses four SQLite databases (primary + cache + queue + cable, all in `storage/`); development only needs the primary.

## Run

```bash
bin/rails server    # http://localhost:3000
bin/rails console
bin/dev             # dev server via bin/dev (what bin/setup launches)
bin/jobs            # standalone Solid Queue supervisor (production runs it inside Puma)
```

The field client expects the API at `http://localhost:3000` by default (override with `VITE_BACKEND_URL` on the frontend).

## Test & verify

```bash
bin/rails test       # minitest — controller tests for the API and the admin portal
bin/rubocop          # style lint
bin/brakeman         # Rails static security scanner
bin/bundler-audit    # gem CVE scanner
bin/importmap audit  # JS dependency CVE scanner
```

Status as of October 2026: tests (22 runs), Brakeman, bundler-audit, and importmap audit all pass clean; **RuboCop reports ~53 offenses** (mostly autocorrectable) — a lint cleanup is a pending follow-up.

## Seeding

`bin/rails db:seed` does two things:

1. Loads `db/seeds/users.rb` — creates a login for every project member (roles: `recorder` for field recorders, `admin` for researchers/reviewers). **Passwords come from the encrypted credentials** (`seed_passwords:` — edit with `bin/rails credentials:edit`), so seeding requires `config/master.key` (or `RAILS_MASTER_KEY`). Ask a project member for credentials.
2. Imports the master catalog (~4,959 features) from `db/features.json`, deduplicated by sheet number.

Without the credentials you can still run the app — just skip seeding and develop against an empty catalog.

## Deployment (Kamal → fdpompeii.org)

Deployed as **one Docker image that also bundles the field client**: the `Dockerfile` builds from the repo root and copies the built SPA into `public/`, so fdpompeii.org serves SPA + API + portal from one origin.

```bash
bin/deploy         # rsync source → build on server → push to ghcr.io → kamal deploy --skip-push
bin/kamal console  # Rails console on the server (aliases: console, shell, logs, dbc — see config/deploy.yml)
```

- Config: `config/deploy.yml` — server, image `ghcr.io/seanmarcia/fdpompeii`, Let's Encrypt SSL for `fdpompeii.org`, persistent volume `fdpompeii_storage`.
- Secrets: `.kamal/secrets` — `RAILS_MASTER_KEY`, and a GHCR password read from the `gh` CLI (needs `gh auth refresh -h github.com -s write:packages`).
- Requires SSH access to the deploy server as configured in `deploy.yml`.

## Notes

- **Backend CI is not active yet.** `backend/.github/` (CI workflow + Dependabot) came from the Rails template, but GitHub only reads `.github/` from the **repo root** — so those checks have never run; only the root workflow (GitHub Pages deploy) is active. Run the "Test & verify" commands locally until the config is relocated to the root `.github/` (planned follow-up).
- CORS is open to all origins (`config/initializers/cors.rb`) — required by the GitHub Pages build of the frontend; production pins `config.hosts` to fdpompeii.org.
- The review workflow's core logic (diffing, reviewer edits, approval merge) lives in `app/models/submission.rb`.
