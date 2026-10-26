# Contributing to pompeii-recorder

Rails backend (`backend/`) + React/Vite field app (`frontend/`), deployed as a
single Kamal container. This guide covers how changes land. For local setup,
see the root `README.md`. Agent working rules live in `AGENTS.md`.

## Branches and merges

- All code lands via **pull requests**. Never commit directly on `main`.
- Work on a short-lived branch. `cf/<short-description>` is the local
  convention.
- PRs are **squash-merged**. The squash collapses the branch into one commit.
  The PR title becomes the squash commit subject.
- Intermediate branch commits exist for review only. Do not amend or rewrite
  them for tidiness.

## Titles

- Short: under ~50 characters.
- Semantic prefix: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- The title becomes the squash commit subject. Put the prefix on the PR title,
  not on intermediate commits.

## Draft status

- Open PRs as **drafts**.
- Marking a PR ready for review is the author's decision, not an agent's.

## PR body

Use `.github/PULL_REQUEST_TEMPLATE.md`. It has three sections, in this order:

### `## Human Description`

The human author's section. Agents never write here. On PR edits, carry this
section forward byte-for-byte.

### `## Change Description`

What changed, at a high level, and **why**.

- Write for a reviewer deciding whether the change is sound, and for a future
  reader of the squashed commit.
- Do not narrate commits or list files. Squash-merge collapses the branch to
  one commit; reviewers have the diff and the commit tab.
- Name decisions and outcomes, not mechanisms. If a reviewer would need to
  open the diff to understand a sentence, the sentence is doing the diff's
  job — say what the change accomplishes instead.
- Prefer bullets that are one line each. A bullet that needs a paragraph of
  justification belongs in the reviewer guide or the tracker, not in the
  change list.
- End with a short **Reviewer guide** note for the judgment calls: the
  alternatives considered and rejected. This puts review effort where a human
  decision is needed.

### `## Test Plan`

How to verify: steps, commands, expected results, and evidence already
gathered. See "Verification" below for this project's verification bar.

If there is nothing to run, say so — for example `None. Documentation only.`
If the change cannot be verified from the PR (it needs the merge, or a UI
bound to the default branch), state that instead of writing steps that
cannot be performed. A test plan step must be performable from the PR
itself.

## Proportionality

Scale the PR body down for trivial changes.

## Linking issues

If the change resolves a GitHub issue, say so in the PR body with a GitHub
closing keyword — for example:

> Fixes #123

GitHub closes the linked issue when the PR merges. Put the keyword on its
own line, in the `## Change Description` section or below it.

## Language

Write agent-authored prose (Change Description, Test Plan) in Simplified
Technical English (ASD-STE100):

- Short sentences.
- Active voice.
- One topic per sentence.
- Approved words only. No idioms. No jargon where a plain word exists.

No internal tracker or planning-document references in PR text. Those stay in
session-local notes.

## Verification

- Verify bugs and features **empirically, in a browser**, against the local
  dev environment. Never reproduce against production.
- Static code reading and data inspection (SQL, logs) produce hypotheses and
  symptoms, not confirmation. Label findings "unverified" until reproduced in
  a live browser.
- Before fixing a reported bug: reproduce it locally first. Record the exact
  steps.
- After a fix or new feature: walk the affected flows, and capture evidence —
  screenshots, DOM assertions, and the steps taken.
- The dev environment seeds from `backend/db/seeds/development.rb`:
  synthetic logins (password `password123!`) and a five-row synthetic review
  queue. One command builds a fresh dev database:
  `cd backend && bin/rails db:drop db:create db:prepare`.
- Production access is read-only.