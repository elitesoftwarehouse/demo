Backend - demo

Questa cartella contiene lo schema Prisma e la migrazione iniziale per il modello User richiesto dalla PWA SmartDesk Coworking.

Contenuti principali:
- prisma/schema.prisma: definizione del modello User con campi minimi e mapping a Postgres
- prisma/migrations/202601170001_init/migration.sql: creazione tabella users con vincoli e indici
- src/modules/user/domain/entities/User.ts: entità dominio TypeScript
- src/modules/user/repository/UserRepository.ts: repository base (pattern) con attenzione a non loggare campi sensibili

Sicurezza e privacy:
- Email archiviata in citext e unica (case-insensitive)
- passwordHash e salt MAI da loggare o restituire in API
- verificationToken opzionale per futura verifica email, con scadenza
- Enum stato account con default ACTIVE

Note di implementazione:
- La colonna salt è opzionale; bcrypt/argon2 generano salt incluso nell'hash
- Gli indici includono unique su email e verificationToken (se presente) e un indice su created_at
- Trigger per updated_at impostato in Postgres; in Prisma è anche marcato @updatedAt

Env richieste:
- DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public

Migrazioni:
- Applicare con Prisma Migrate o eseguire manualmente lo SQL in migrations/ se non si usa Prisma CLI.
