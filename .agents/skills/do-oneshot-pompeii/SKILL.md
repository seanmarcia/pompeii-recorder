---
name: do-oneshot-pompeii
description: Use when asked to do, implement, fix, or ship one GitHub issue in the pompeii-recorder repository end to end — from reading the issue through grilling the ambiguities, writing tests, building the fix, passing subagent review, to a draft PR with executed acceptance evidence. The PR is created only at the end, after review passes. Runs in OpenCode against local dev. One issue = one atomic PR. Do not use for discovery or planning of a feature.
---

# Do a oneshot (pompeii-recorder)

Take one GitHub issue from request to one draft PR with proof the acceptance criteria pass. One tightly scoped outcome, one PR. The PR is created only at the end (Phase 7), **after subagent review and fixes** — no PR exists while build or review is still in flight. If the work grows into two or three concerns, stop and say so — the issue needs splitting, not a bigger PR.

Repository context lives in `AGENTS.md` (tracked — workflow, PR rules, verification policy, dev environment, browser driving rules) and `CONTRIBUTING.md` (branches, titles, PR body sections, proportionality, verification bar). Read both before Phase 1.

## Inputs

The work item is a GitHub issue number or URL. Fetch it with `gh issue view <n>` (gh resolves the repository from the checkout's remote). The issue body carries the summary, current/expected behavior, files involved, and any decisions from the grilling that filed it. Decisions recorded in the issue are **agreed** — do not re-open them. Personal tracking stays private: never name local planning files in commit messages, PR titles, PR bodies, or comments.

## Phase 0: Preflight

- `gh auth status` — stop if not authenticated; the PR (created in Phase 7) is the state store.
- `git status` — must be clean, on an up-to-date `main` (`git pull origin main`).
- Branch: `cf/<short-description>` from `main`. Work locally; the branch is pushed when the PR opens (Phase 7), or earlier if a second machine/session needs it. No PR exists before Phase 7.
- Scratch file: `tmp/oneshot/<issue-number>-<slug>.md` (`tmp/` is gitignored). Record the packet, the plan, and phase progress here; the PR body takes over after Phase 7.

## Phase 1: Research

Read the issue and the code it names. Separate evidence (read the file, query the dev DB with `sqlite3 backend/storage/development.sqlite3`) from inference. Identify the exact change surface: for a bug, the failing path; for a feature, the pattern to follow (nearest existing implementation). Note the seeded dev data a scenario will need (`backend/db/seeds/development.rb` — synthetic logins, password `password123!`).

**Done when:** you can name the files, the pattern, and the tests to extend, and the change fits one PR.

## Phase 2: Grill the ambiguities

Only genuine ambiguities reach the user — questions the code or the issue body already answer do not. Use the grilling skill's discipline: one consequential question at a time (or a small independent set), each with concrete options and a recommendation when evidence supports one, in dependency order.

Typical ambiguity sources here: default behavior (who/what pre-fills), blank-state handling (what lands in the DB or queue when a field is left empty), list composition (which options a select offers and in what order), and edge data (legacy values, shared devices, offline).

Output: **agreed** Gherkin acceptance criteria, written into the scratch file. Criteria are at the observable-behavior bar: a real user (researcher, recorder, admin) takes the action through the real UI or API, and the Then is observable — on screen, or as DB ground truth via `sqlite3`. Each scenario names its `Verify via:` line (browser for UI, `sqlite3`/`bin/rails runner` for backend). At least one scenario covers the primary success path. No criterion asserts internal state the product does not show.

## Phase 3: Tests first

- **Backend:** minitest, extending the existing files under `backend/test/` in the existing style. Write the failing test(s) against the agreed criteria first.
- **Frontend logic:** `node --test` in `frontend/test/*.test.js`, matching the existing pattern.
- **Frontend components:** Storybook story + interaction test for the touched component, if a story exists or the change warrants one (infra landed separately).
- Commit tests red or green per judgment, but the criteria are only satisfied by Phase 6 execution — a green spec never closes a criterion by itself.

**Done when:** tests exist that would fail on current `main` and pass on the fix.

## Phase 4: Build

Implement the fix on the branch. Follow the frontend data patterns (`frontend/src/data/`, `frontend/src/components/`) and backend patterns (`app/models/submission.rb` validators, `api/v1/` controllers). Red-flag scan before committing: `git status --porcelain`, `git diff --stat` — no stray files, no `console.log`/`binding.pry`, no files outside the issue's scope. Commit with the semantic prefix on the **PR title**, not intermediate commits.

## Phase 5: Review with a subagent

Delegate review to a fresh subagent (explore or general agent). Hand it: the checkout path, the issue body, the agreed criteria, the branch and head SHA, and a report path under `tmp/oneshot/<slug>/review/`. It reads the code and `AGENTS.md`/`CONTRIBUTING.md` itself; it does not edit. Triage every finding: fix, record as false positive with reason, or surface to the user if consequential. Commit fixes and rerun the affected tests.

**No PR has been opened at this point — that is deliberate.** A PR created before review invites merging unreviewed work; findings that surface now land as ordinary commits before anything is visible to merge. Do not open the PR "to share progress" — the scratch file is the progress record.

**Findings that outgrow the oneshot:** if the review (or Phase 6 execution) surfaces real problems beyond this issue's scope — a pre-existing bug, a broader defect the fix exposed — do not widen this PR. File a **new GitHub issue** describing each problem with repro evidence, and note the issue numbers in the PR body's Reviewer guide and in the Phase 8 report. One issue = one PR holds: the follow-up gets its own oneshot.

## Phase 6: Acceptance — execute the criteria

This is the verification bar (AGENTS.md "Verification policy"). Dev servers: `overmind start -f Procfile.dev` from the repo root (Rails :3000, Vite at `http://localhost:5173/pompeii-recorder/` — the base path, root 302s there).

Drive every scenario via the **Playwright MCP** (`browser_navigate`, `browser_snapshot`, interaction tools with `ref=eNN` snapshot refs — never DOM-order finders, the selects share identical option lists). After state-changing clicks, wait for marker text (`browser_wait_for`) — React 19 renders async. Confirm DB ground truth with `sqlite3 backend/storage/development.sqlite3` — never UI feedback alone. Screenshot each scenario's result (`browser_take_screenshot`, explicit arguments, artifacts under `tmp/.playwright-mcp/`).

PASS / FAIL / BLOCKED per criterion, recorded with the evaluated SHA. FAIL → fix in Phase 4, re-review affected diff, rerun the scenario. Max three fix-and-rerun cycles, then stop and report. BLOCKED (environment, servers won't boot) → report the exact failure.

## Phase 7: Evidence in the PR

Now — and only now — open the **draft** PR (`gh pr create --draft`), after Phase 5 review is triaged and fixes are committed. Per `CONTRIBUTING.md`: title `fix:/feat:/chore: <summary>` under ~50 chars; body sections `## Human Description` (empty), `## Change Description` (what and why, short; closing keyword `Fixes #<n>` if the issue resolves), `## Test Plan` — proportional to the change (trivial docs changes may say `None. Documentation only.`; never write steps that need the merge first). Simplified Technical English throughout.

Attach the executed evidence so it renders **in the PR**: `gh pr edit <n> --attach <screenshot paths>` — PNG/JPG/GIF/WebP/MP4. Put the scenario table in the body: criterion, result, evaluated SHA, evidence link. Test-plan steps must be performable from the PR.

The PR stays a draft. Marking ready is the human's decision.

## Phase 8: Report and write-back

Concise report: PR link, what changed, scenario table with results and evidence, review triage summary, anything deferred (its own issue), and what the human must do next (mark ready, merge, deploy). If the issue resolves fully, confirm the closing keyword links it; on squash-merge the PR title becomes the commit subject.

## Exits

- **Too big / multiple concerns:** stop, report the seams, propose the split.
- **Ambiguity that grilling can't settle without the researchers (external input):** record it in the issue or PR as an open question and stop that thread.
- **Blocked environment:** servers won't boot, tools missing — report the exact failure, never skip the gate.
- **Review blockers found after a PR was opened early (legacy flow or user request):** stop merging; fix on the branch, note in the PR body that review ran post-open, and re-request review before ready-for-review. This is the recovery path, not the plan — the skill's order is review-then-PR.

## Resume

The scratch file is always the state store for pre-PR phases; once Phase 7 has run, the PR body holds the scenario table. On a re-run: fetch, read the scratch file (and the PR body if it exists), `git log` the branch, and pick the first incomplete phase. Say in two lines what's done and where you're picking up. Never re-open a PR that already exists and never create one before Phase 7 completes with review triaged.