User Data Model - SmartDesk Coworking

Scope: Define minimal fields for signup and account lifecycle.

Entity: User (table: users)
- id: UUID (primary key)
- email: string, unique, max 320 chars, lowercase normalized (enforce at app level), indexed
- passwordHash: string, bcrypt/argon2 hash; column name password_hash
- salt: optional string if hashing library requires/returns it; nullable
- status: enum AccountStatus { ACTIVE, PENDING_VERIFICATION, SUSPENDED, DISABLED } default ACTIVE
- createdAt: timestamp with time zone, default now()
- updatedAt: timestamp with time zone, auto-updated on update
- verificationToken: optional string (for email verification); column verification_token
- verificationExpiresAt: optional timestamp; column verification_expires_at

Constraints & Indexes
- UNIQUE(email)
- CHECK email contains '@' (basic sanity)
- INDEX(created_at)
- INDEX(verification_token)

Security
- Never log: passwordHash, salt, verificationToken, verificationExpiresAt
- Ensure DTOs and logs use safe serializers (see User.toJSONSafe())

Migration strategy
- Create enum type account_status and table users as defined in migrations/001__create_users.sql
- Provide Prisma schema mirror for ORMs using Prisma
