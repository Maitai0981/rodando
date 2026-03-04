# DB Scripts

Database maintenance scripts for the backend.

- `db-migrate.js`: applies PostgreSQL schema and bootstrap data.
- `seed-roles.js`: ensures base roles (`customer`, `owner`).
- `seed-owner.js`: creates/updates one owner account from args/env.
- `reset-non-user-data.js`: clears operational tables (defaults to no reseed; pass `--reseed-base` to repopulate catalog samples).
- `purge-test-comments.js`: removes only reviews/comments tied to known test/e2e users.
- `purge-demo-users.js`: removes known demo/e2e users.
- `clean-real-data.js`: full cleanup for real-data mode (preserves real users/roles, removes demo users, keeps operational tables empty).
- `migrate-sqlite-to-postgres.js`: imports legacy SQLite data.
