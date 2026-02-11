Database migrations

- Place SQL migrations in this folder using incremental numbering (e.g., 0001, 0002, ...).
- Target database: PostgreSQL 14+.
- Conventions:
  - snake_case for table and column names
  - UUID primary keys
  - timestamps: created_at, updated_at (TIMESTAMPTZ)
  - emails stored as CITEXT for case-insensitive uniqueness
  - NO plaintext password storage; store only password_hash (bcrypt/argon2) and optional per-hash salt if library doesn't embed salt in hash string.
- Sensitive columns (password_hash, verification_token) must never be logged in application code.
