# AGENTS.md

Notes for AI coding agents working in this repository.

**Read `AGENTS.local.md` next, if it exists** (repo root, gitignored). It holds the
environment-specific details — production host, SSH, app accounts, credential handling.
This file holds only what is safe to publish.

## Git push auth

Git push auth goes through the gh CLI credential helper (`gh auth setup-git`, applied).
The macOS keychain helper fails in non-interactive agent shells; if a push ever fails with
`could not read Username ... Device not configured`, run `gh auth setup-git` again.

## Merge workflow

- All code lands via **PRs** — never commit directly on `main`; work on a short-lived branch (`cf/<short-description>` is the local convention).
- PRs are **squash-merged** — team practice (GitHub's merge-commit/rebase options are also enabled; we don't use them). The PR title becomes the squash commit subject, so the semantic prefix (`feat:`, `fix:`, `chore:`, …) belongs on the **PR title**, not on intermediate commits.
- Intermediate branch commits exist for review granularity only — don't amend or rewrite local history for tidiness; the squash collapses everything at merge.

## PR conventions

**Before creating or editing any PR, read `CONTRIBUTING.md` (PR rules) and `.github/PULL_REQUEST_TEMPLATE.md` (body skeleton).** Apply the template's sections and its comment instructions; strip instruction comments from the final body.

- **Open PRs as drafts.** Marking ready for review is a human decision, not an agent's.
- **Title:** short — under ~50 characters, semantic prefix (`feat:`, `fix:`, `chore:`, …). The title becomes the squash commit subject.
- **Body:** follows the template — `## Human Description` (human's section; agents never write there, carry it forward byte-for-byte on edits), `## Change Description` (what and why, not files or commit narration; short "Reviewer guide" note for judgment calls), `## Test Plan` (steps, commands, expected results, evidence).
- **Write agent-authored prose** (Change Description, Test Plan) in Simplified Technical English (ASD-STE100): short sentences, active voice, one topic per sentence, approved words only — no idioms, no jargon where a plain word exists.
- **Creating issues via the GitHub CLI:** the CLI does not apply the issue template — it posts exactly the body you pass. Build the body from `.github/ISSUE_TEMPLATE.md` manually (Summary / Current behavior / Expected behavior / Files involved / Notes), skipping sections that don't apply.
- No internal tracker or planning-document references in PR text; those stay in session-local notes.

## Verification policy

Bias bug discovery, bug fixing, and new-feature verification toward **empirical, in-browser verification** using the Playwright MCP server (`playwright`, configured in the repo-root `opencode.json`, version-pinned, writing artifacts to `tmp/.playwright-mcp/`) against the **local dev environment** — never production.

- Static code reading and data inspection (SQL, logs, screenshots of DB rows) produce **hypotheses and symptoms, not confirmation**. Label them "unverified" until reproduced in a live browser.
- **Before fixing a reported bug:** reproduce it locally first — log in, navigate, perform the action, observe. Record the exact repro steps.
- **After a fix or new feature:** walk the affected flows via Playwright MCP (navigate, interact, assert on the DOM) and capture evidence: screenshots, DOM/text assertions, and the steps taken (login → route → action).
- Production access stays read-only. Reproduce issues locally with seeded/synthetic data instead.
- If browser tools are missing, check `opencode mcp list` for the `playwright` server connection state.

## Local dev environment

### Toolchain

Ruby and Node versions are mise-managed (see the root `README.md`). System Ruby is too old and fails; run backend commands via `cd backend && mise exec -- <cmd>` (or rely on mise-activated shims).

First-time backend setup, in order:

```bash
cd backend
mise exec -- gem install bundler -v 4.0.10 --no-document
mise exec -- bundle install
mise exec -- bin/rails db:prepare
```

On a fresh dev database, `db:prepare` runs the full seed chain: the features.json import (~4,959 master features), then `db/seeds/development.rb` (dev logins + the synthetic review queue). One command, no manual seed step, no credentials needed.

### Dev servers and URLs

- Start both with one command ([overmind](https://github.com/DarthSim/overmind)): `overmind start -f Procfile.dev` (Rails + Vite from the root `Procfile.dev`; overmind installs via `brew bundle` from the root `Brewfile`).
- Backend: `bin/rails server -p 3000` → `http://localhost:3000` (admin review queue at `/admin`; API at `/api/v1/*`)
- Frontend: `cd frontend && npm run dev` → Vite at **`http://localhost:5173/pompeii-recorder/`** — not the root. `/` 302-redirects there because `vite.config.js` sets `base: '/pompeii-recorder/'`.

### Dev data

- Seeding is env-split: `db/seeds.rb` runs the shared features.json import, then loads `db/seeds/#{Rails.env}.rb`. Dev loads `db/seeds/development.rb` (synthetic logins + review queue); production loads `db/seeds/production.rb` (logins from encrypted credentials). The dev seed is gated structurally — it cannot run in production because `db:seed` there loads `production.rb` instead.
- All dev logins get password `password123!`; usernames are lowercase concatenated full names (e.g. `lisakahn`, `serabaker`). `andreaadmin` (Andrea Admin) is the generic dev admin. Dev logins exist only for names a verification scenario or a real sheet references: the 3 researchers, the 99901 trio (Terry Bruno, Loretta Dimitruk, Lilly Lacetti), and the sheet-6083 chain (Linda Baxter, Sera Baker, Rob Brown).
- The synthetic review queue reproduces reported symptoms: 3-way pending collision on new sheet **99901**, an "overfilled" `update_existing` on sheet **6083** (merge-clobber repro), and a blank-submitter row. **Idempotent (verified 2026-10-26):** re-running `db/seeds/development.rb` (e.g. `bin/rails runner db/seeds/development.rb`) destroys only `[dev-seed]`-tagged submissions, then recreates them — submission count stays at 5 across re-runs.
- **DB is ground truth** for what a browser action persisted:

```bash
sqlite3 backend/storage/development.sqlite3 "SELECT ... FROM submissions ORDER BY id DESC LIMIT 3;"
```

Never trust only UI feedback.

### Image input

The primary model in most sessions may not support image input. When a task requires reading a photo or image (e.g. transcribing the printed category sheets), **delegate the image reading to a subagent running a vision-capable model** instead of failing the task:

- Preferred: spawn a subagent on **`openrouter/z-ai/glm-5.3-flashx`** (paid OpenRouter model — the one we're already paying for).
- **Do not use `opencode/glm-5.3-flash-free`.** It works until it hits the free usage limit mid-task and then hard-fails the subagent — this has cost us an hour before. The free model only becomes an option if the user explicitly asks for it.
- Give the subagent the image file paths, the sections to transcribe, and instructions to preserve exact printed spelling/case and to flag unreadable text rather than guess.

## Driving the browser (Playwright MCP)

**Golden rule: drive the page with snapshot refs, never DOM-order finders.** Use the dedicated interaction tools with `ref=eNN` refs from `browser_snapshot` — **not** hand-rolled DOM queries in `browser_evaluate`. Snapshot refs are **per-snapshot**: re-snapshot after every navigation or state change before interacting.

**Why:** DOM-order-based finders are ambiguous in this app. Several selects share identical option lists (Recorder Name, Photographer, Sketch Artist, and "Your Name / Data Entered By" all use the recorder-name list), so "the select that has option X" matches the **wrong** element. This actually happened: a test intended to set "Data Entered By" to Loretta Dimitruk instead set `RECORDER_ID`, and the wrong value landed in the DB.

- **React 19 async rendering:** after a click that swaps views (login → start page, start → form, submit → start), wait before asserting DOM — `browser_wait_for({ text: "..." })` with a stable marker text, or a short `time`.
- **If you must set React controlled inputs from `browser_evaluate`:** use the native value setter + dispatch a bubbling event: for inputs/textareas, `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)` then `el.dispatchEvent(new Event('input', { bubbles: true }))`; for selects, `HTMLSelectElement` and a `'change'` event. React attaches listeners for both `'input'` and `'change'` at the root — but the dedicated Playwright tools are always safer.
- `browser_take_screenshot` **requires explicit arguments**; calling it with none fails validation.
- `browser_run-code_unsafe` runs in **Node.js** context (no `document`); prefer `browser_evaluate` for in-page reads.

**Stable marker texts (field app):** login button "Authenticate"; start-page buttons "Start a New Sheet" / "Edit an Existing Sheet" / "View an Existing Sheet"; form submit "Send to Review Queue →" (or "Save to Offline Outbox" when offline); sheet number input placeholder "e.g. 6083".

**Known behavioral facts (verified 2026-10-26):**

- **Login form:** two inputs in DOM order `[Username, Password]` + the "Authenticate" button. After login the header shows the user's full name and (for admins) an "Admin Queue →" link to `:3000/admin`.
- **Researchers don't appear in "Your Name / Data Entered By":** that select lists recorders only. A researcher submitting a new sheet leaves it empty, and the backend defaults `submitter_name` to **"Field Archaeologist"** (`api/v1/submissions_controller.rb`).
- **Sign Out** clears ONLY localStorage `isAuthenticated` and `currentUser`. It does NOT clear `pompeii_last_submitter_name_v1` — the last submitter name persists across sign-out/sign-in on the same browser profile. Shared-device tests must account for this.
- **Drafts:** forms auto-save to localStorage (`pompeii_draft_v1_new` / `pompeii_draft_v1_edit_<SHEET>`); a resumed draft overrides defaults. To test fresh-form behavior, clear these keys or use a fresh browser profile.
- **After a successful submit:** the app clears the draft and returns to the start page with a success banner including a **"Record Token"** (the submission id).

## Rules for agents

- Never commit directly on `main` — see Merge workflow.
- Production access is read-only. Connection details live in `AGENTS.local.md`. Any change to production — appending keys, editing configs, restarting services, writing/deleting data — requires explicit user confirmation in the session first.
- Never print private key material. Public keys and fingerprints are fine.

## File tracking

- `AGENTS.md` (this file) is **tracked and pushed** — keep it free of environment-specific details.
- `AGENTS.local.md` is **gitignored** (see `.gitignore`). It is never committed or pushed. If you re-clone the repo, re-create it from your private notes.