Desk Status API (Postazioni)

Endpoint
- GET /api/postazioni/status

Response (200)
- JSON object
  - success: boolean
  - data: DeskStatusDTO[]
    - id: string (e.g., desk-1..desk-12)
    - label: string (e.g., Postazione 1)
    - status: 'LIBERA' | 'OCCUPATA' | 'NON_DISPONIBILE'
    - updatedAt: ISO string
    - meta: object (optional)
  - cache: { maxAge: number } (hint for caching)

Notes
- States mapping must match front-end labels and colors.
- Light cache-control: public, max-age=2. The dashboard can poll every few seconds.
- Repository abstraction allows swapping with DB or external service without changing API.
