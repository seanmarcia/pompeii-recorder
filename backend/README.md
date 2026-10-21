# README

## Local sign-in

Run `bin/rails db:migrate` from `backend/` after pulling changes. This corrects
existing Lisa Khan accounts to **Lisa Kahn**, username **`lisakahn`**, without
changing their password or account ID.

For a new database, run `bin/rails db:seed` to create the named accounts using
the passwords in encrypted credentials. Seeding also resets existing named
accounts to those configured passwords.

All listed recorder and researcher accounts can sign in to the field app offline
on a new browser/device using their group's password, without a prior online
login. Run the Rails server with `bin/dev` for online syncing and the admin
portal; it is not required for offline field-app login.

If another app uses port 3000, start this backend with `bin/dev -p 3001`.
From `frontend/`, start Vite with
`VITE_BACKEND_URL=http://localhost:3001 npm run dev` so sign-in reaches this
backend rather than the other app. To keep this setting across frontend restarts,
put `VITE_BACKEND_URL=http://localhost:3001` in `frontend/.env.local` (gitignored).

## Reviewing field sheets

The review page uses the same field labels as the frontend: Category, Usage
Classification, and Your Name / Data Entered By. The queue identifies the
submitter as Data Entered By.

Category corrections use the same five choices: Commercial, Public,
Commercial-Domestic, Domestic-Commercial, and Religious. Older category values
remain visible and are preserved unless a reviewer replaces or clears them.
Usage classification and late-usage details remain stored together in `USAGE_ID`.

The **Master Sheets** navigation link opens a searchable, paginated catalog with
read-only sheet details and associated submitted/reviewed records. The queue's
**View Sheet** action opens a submission without inline editors or approval and
rejection controls; **Review / Edit Submission** returns to the normal workflow.
Viewing is restricted to the same admin accounts as the existing review portal
and does not alter master records or submissions.

HEIC/HEIF images from the field client arrive as compressed JPEG attachments;
conversion happens on the device before online upload or offline storage.

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version

* System dependencies

* Configuration

* Database creation

* Database initialization

* How to run the test suite

* Services (job queues, cache servers, search engines, etc.)

* Deployment instructions

* ...
