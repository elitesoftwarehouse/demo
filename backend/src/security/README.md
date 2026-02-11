Security services

This folder contains reusable security utilities for the backend API.

Modules
- password.service.ts
  - hashPassword(plainPassword): Promise<string>
  - verifyPassword(plainPassword, passwordHash): Promise<boolean>
  - validatePasswordStrength(password, policy?): PasswordValidationResult
  - Environment-driven configuration:
    - PASSWORD_HASH_ALGO: "argon2" (default) or "bcrypt"
    - ARGON2_TIME_COST (default 3), ARGON2_MEMORY_KIB (default 65536), ARGON2_PARALLELISM (default 1)
    - BCRYPT_COST (default 12)
  - Never logs passwords/hashes.

- validation.service.ts
  - normalizeEmail(email): string
  - validateEmail(email): { valid: boolean, normalized?: string, error?: string }
  - validatePassword(password, policy?): PasswordValidationResult

Notes
- The actual hashing library must be installed in the runtime environment:
  - Preferred: argon2
  - Fallback: bcrypt or bcryptjs
- Choose the algorithm via PASSWORD_HASH_ALGO env var.
