# Deploying the frontend to GitHub Pages

The frontend is a static Vite/React build, so it can be hosted on GitHub
Pages. The Rails backend cannot run on Pages — see "Backend connectivity"
below for what that means in practice.

## One-time setup (already done in this repo)

- `.github/workflows/deploy.yml` builds `frontend/` and deploys `frontend/dist`
  on every push to `main` that touches `frontend/**`.
- `frontend/vite.config.js` sets `base: '/pompeii-recorder/'` so built asset
  paths resolve correctly at `https://<username>.github.io/pompeii-recorder/`.
  If the repo is ever renamed, update this to match.

## Enable Pages (one-time, in the GitHub UI)

1. Go to the repo's **Settings > Pages**.
2. Under "Build and deployment", set **Source** to **GitHub Actions**.
3. Push to `main` (or run the "Deploy Frontend to GitHub Pages" workflow
   manually from the **Actions** tab) to trigger the first deploy.
4. The site will be live at `https://<username>.github.io/pompeii-recorder/`.

## Backend connectivity

`VITE_BACKEND_URL` (see `frontend/src/lib/api.js`) controls which Rails API
the frontend talks to; it defaults to `http://localhost:3000`, which isn't
reachable from a deployed site. Without a real backend:

- Listed recorders and researchers can sign in offline with their group's
  password, even without a prior online login on that browser/device. Only
  PBKDF2 password verifiers are bundled, not plaintext passwords.
- The room catalog falls back to the bundled `public/features.json` snapshot.
- Submissions save to the browser's local offline outbox only - they are
  never synced anywhere until a real backend is configured.

Offline sign-in requires HTTPS or localhost for Web Crypto. The app must have
been opened once with a connection so its files can be cached; no successful
online login is required for listed field users. When a group's password changes,
regenerate its verifier in `frontend/src/data/people.js` and rebuild the frontend.
The Rails admin portal still requires a running backend.

To connect the deployed frontend to a real Rails backend:

1. Deploy `backend/` somewhere publicly reachable (Fly.io, Render, Heroku,
   etc.) over HTTPS - GitHub Pages is HTTPS-only, so a plain `http://` API
   will be blocked by the browser as mixed content.
2. Add a repository secret named `VITE_BACKEND_URL` set to that backend's
   URL (**Settings > Secrets and variables > Actions**).
3. Re-run the deploy workflow.

## Subsequent deployments

Just push to `main` - the workflow rebuilds and redeploys automatically.
