# Autenticazione JWT - SmartDesk Coworking

Questo documento definisce il flusso di autenticazione, il payload dei JWT, la gestione dei token e il modello dati di supporto.

## 1) Stato attuale modello utenti

Tabella users (esistente)
- id: UUID PK
- email: CITEXT UNIQUE (case-insensitive), normalizzata a lower-case a livello applicativo
- password_hash: TEXT (argon2id/bcrypt)
- status: ENUM-like via VARCHAR ('ACTIVE' | 'SUSPENDED' | 'DISABLED')
- verification_token, verification_expires_at: opzionali, per futura verifica email
- created_at, updated_at: TIMESTAMPTZ

Ruoli/Profili: non presenti attualmente. Per semplicità, il JWT include un array roles vuoto; potrà essere esteso con una tabella user_roles.

## 2) Payload minimo JWT

Header
- alg: HS256
- typ: JWT

Payload access token
- sub: user id (UUID)
- email: email normalizzata
- roles: string[] (opzionale, default [])
- iat: issued at (epoch sec)
- exp: expiry (epoch sec)
- iss: issuer (opzionale)
- aud: audience (opzionale)

Payload refresh token
- medesimo payload dell'access, con claim tip: 'refresh' o altro marker applicativo

Nota: non includere dati sensibili nel payload.

## 3) Validità e algoritmi

- Algoritmo firma: HS256 (HMAC-SHA256)
- Gestione secret: variabile d'ambiente JWT_SECRET (usare secret manager in ambienti prod)
- Issuer/Audience: configurabili via JWT_ISSUER, JWT_AUDIENCE
- Scadenze consigliate:
  - Access token: 15 minuti (JWT_ACCESS_TTL=15m)
  - Refresh token: 7 giorni (JWT_REFRESH_TTL=7d)

## 4) Casi di errore

- invalid_input: body mancante o non valido
- invalid_credentials: email inesistente o password errata (messaggio generico per non leakare)
- account_inactive: utente SUSPENDED o DISABLED
- rate_limited: opzionale, da implementare via middleware esterno
- internal_error: errori inattesi

## 5) Tracciamento sessioni e revoca

Tabella user_sessions (nuova)
- id: UUID PK
- user_id: FK -> users.id (ON DELETE CASCADE)
- refresh_token_hash: TEXT (sha256 del refresh token)
- user_agent: TEXT (opzionale)
- ip_address: TEXT (opzionale)
- created_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ (allineata alla scadenza del refresh token)
- revoked_at: TIMESTAMPTZ (se impostato, considerare il token revocato)

Operazioni
- Login: genera access+refresh; persist refresh_token_hash con expires_at
- Refresh: verifica firma+exp, verifica presenza e non revoca in user_sessions; emette nuovo access e opzionale nuovo refresh (rotate); aggiorna/persisti nuova sessione, revocando la precedente (rotazione obbligatoria consigliata)
- Logout: marca revoked_at sulla sessione corrente
- Logout all: revoca tutte le sessioni di un utente

## 6) Diagramma di flusso (alto livello)

Login
1. Client -> POST /auth/login {email, password}
2. API: trova utente per email e verifica password
3. Se ok e account attivo, emette access(15m) + refresh(7d)
4. Persisti user_sessions con hash(refresh), scadenza e metadati UA/IP
5. Risposta 200 con tokenType Bearer e scadenze

Refresh
1. Client -> POST /auth/refresh {refreshToken}
2. API: verifyJwt(signature+exp), calcola sha256(refreshToken)
3. Cerca sessione per hash, verifica non revocata e non scaduta
4. Emetti nuovo access e ruota il refresh (nuovo record, revoca vecchio)
5. Risposta 200 con nuovi token

Logout
1. Client -> POST /auth/logout
2. API: calcola hash del refresh corrente e marca revoked_at

## 7) Sicurezza operativa

- Conservare JWT_SECRET in secret manager
- Impostare httpOnly+Secure per refresh token se veicolato via cookie
- Limitare il blast radius: access breve, refresh rotato e revocabile
- Registrare tentativi di login falliti per rate limiting/blocco account (futuro)

## 8) Endpoints previsti (draft)

- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

## 9) Estensioni future

- user_roles o campo roles su users
- account status PENDING_VERIFICATION e verifica email
- MFA (TOTP/WebAuthn) opzionale
