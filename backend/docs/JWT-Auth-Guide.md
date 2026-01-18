SmartDesk Coworking - Guida all’Autenticazione JWT e Refresh

Scopo
- Descrivere il meccanismo di autenticazione basato su JWT (access token) e il flusso di refresh token.
- Documentare middleware di protezione, endpoint, formati richieste/risposte ed errori.
- Fornire note di sicurezza e raccomandazioni per il front-end.

Panoramica Token
- Access Token (JWT HS256)
  - Uso: autenticazione veloce per API protette.
  - TTL tipico: 15 minuti (configurabile via env: JWT_ACCESS_TTL).
  - Claims principali: iss, aud, iat, exp, sub (userId), email, roles (opzionale), ver (opzionale).
  - Firmato con secret separata: JWT_ACCESS_SECRET.
- Refresh Token (opaco)
  - Uso: ottenere nuovi access token senza reinserire le credenziali.
  - Forma: stringa random base64url; lato server si conserva SOLO l’hash HMAC-SHA256 con JWT_REFRESH_SECRET.
  - TTL tipico: 30 giorni (configurabile via env: JWT_REFRESH_TTL).
  - Metadati persistiti: userId, tokenHash, issuedAt, expiresAt, userAgent, ipAddress, familyId, revokedAt/reason.

Middleware JWT e Protezione Rotte
- Middleware: jwtAuthGuard (src/modules/auth/http/JwtAuthMiddleware.ts)
  - Estrae il token dal header Authorization: "Bearer <token>".
  - Verifica firma, issuer, audience, integrità e scadenza tramite JwtService.
  - In caso di successo, popola req.user con { id, email, roles?, raw }.
  - Opzione requireRoles: usare requireRoles('ADMIN', ...) per vincolare l’accesso.
- Comportamento errori
  - Token mancante/non in formato Bearer: 401 { success: false, error: { message } }.
  - Token scaduto/non valido: 401 { success: false, error: { message, code?: 'TOKEN_EXPIRED' | ... } }.
  - Ruoli insufficienti: 403 { success: false, error: { message: 'Forbidden: insufficient role' } }.
- Rotte protette (esempio implementazione)
  - /api/auth/me protetta: restituisce info utente corrente.
  - Prefisso /api/private protetto globalmente con jwtAuthGuard().

Endpoint Principali
1) POST /api/auth/login
- Body: { email: string, password: string }
- Risposta 200: { success: true, data: { accessToken, tokenType: 'Bearer', expiresIn, refreshToken, user: { id, email, status } } }
- Errori: 400 (input non valido), 401 (credenziali errate), 403/423 (account non attivo), 500.

2) POST /api/auth/refresh
- Scopo: generare un nuovo access token usando un refresh token valido; può eseguire rotazione del refresh.
- URL: /api/auth/refresh
- Metodo: POST
- Autenticazione: non richiede access token. Il refresh token può essere passato via:
  - Body JSON: { refreshToken: string }
  - Cookie HttpOnly (se configurato): refreshToken | rt | refresh_token
- Richiesta (JSON): { "refreshToken": "<token-opaco>" }
- Risposta 200: { success: true, data: { accessToken: string, tokenType: 'Bearer', expiresIn: number, refreshToken?: string, rotated: boolean } }
  - rotated = true se il server ha ruotato il refresh token (nuovo refreshToken incluso).
  - rotated = false se non è stato possibile ruotare; in tal caso potrebbe non essere incluso refreshToken.
- Errori
  - 400: input non valido (manca refreshToken o tipo errato).
  - 401: refresh token inesistente, scaduto o revocato.
  - 501: funzionalità di refresh non abilitata nel repository in uso.
  - 500: errore interno.

3) POST /api/auth/logout
- Scopo: revocare un refresh token specifico o tutte le sessioni dell’utente autenticato.
- Metodo: POST
- Protezione: richiede access token se si usa l’opzione all=true (revoca globale per utente).
- Body: { refreshToken?: string, all?: boolean }
- Risposte: 200 { success: true } anche se il token non esiste, per non rivelare stato.
- Errori: 400 (input), 501 (non supportato), 500.

Esempi
- Login
  - Richiesta:
    - POST /api/auth/login
    - Headers: Content-Type: application/json
    - Body: { "email": "user@example.com", "password": "Str0ng!Pass" }
  - Risposta 200:
    - { "success": true, "data": { "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": 900, "refreshToken": "<opaque>", "user": { "id": "...", "email": "user@example.com", "status": "ACTIVE" } } }
- Accesso a rotta protetta
  - GET /api/private/health con Header Authorization: Bearer <jwt>
  - 200 ok → { success: true, data: { status: 'ok', userId: '<uid>' } }
  - Senza header → 401 { success: false, error: { message: 'Unauthorized: missing bearer token' } }
- Refresh
  - POST /api/auth/refresh
  - Headers: Content-Type: application/json
  - Body: { "refreshToken": "<opaque>" }
  - 200:
    - { "success": true, "data": { "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": 900, "refreshToken": "<opaque-rotated>", "rotated": true } }
  - 401:
    - { "success": false, "error": { "message": "Invalid refresh token" } }

Header Authorization
- Formato: Authorization: Bearer <access-jwt>
- Non includere mai il refresh token nell’Authorization header.

Cookie (opzionale)
- Se si consegna il refresh via cookie, raccomandazioni:
  - httpOnly, secure, sameSite=strict, path=/api/auth
  - Nome supportato dal controller: refreshToken (alias: rt, refresh_token)
  - Il middleware non legge i cookie; solo l’endpoint di refresh/logout li considera.

Note di Sicurezza
- Memorizzare solo hash dei refresh token (HMAC-SHA256) e non il valore in chiaro.
- Non loggare mai token, hash o password.
- Preferire cookie HttpOnly+Secure per il refresh su browser; valutare i trade-off se si usa local/session storage.
- Implementare rotazione del refresh token: all’uso viene revocato il precedente e creato un nuovo token (familyId costante).
- In caso di uso di un token revocato, considerare revoca dell’intera famiglia e alert di sicurezza.
- Gestire furto dell’access token: breve TTL, nessun privilegio elevato senza ulteriori controlli, possibilità di invalidazione lato gateway.
- Proteggere le API con rate limiting e protezioni anti-brute-force sul login.

Configurazione
- JWT_ACCESS_SECRET (>=32 byte), JWT_REFRESH_SECRET (>=32 byte)
- JWT_ISSUER, JWT_AUDIENCE
- JWT_ACCESS_TTL (es. 15m), JWT_REFRESH_TTL (es. 30d)
- REFRESH_TOKEN_BYTES (es. 64)

Riferimenti Implementativi
- JwtService: src/core/security/JwtService.ts
- Middleware: src/modules/auth/http/JwtAuthMiddleware.ts
- Controller/Routes: src/modules/user/http/AuthController.ts, src/modules/user/http/routes.ts
- Persistenza refresh: src/modules/auth/repository/* e prisma/schema.prisma
