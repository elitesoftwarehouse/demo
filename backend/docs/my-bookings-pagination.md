My Bookings API - Pagination and Status Filter

Overview
- Endpoint: GET /api/bookings/my (aka /api/bookings/me in some clients)
- Auth: Bearer access token required
- Purpose: Return current user's bookings with pagination and optional state filter

Query parameters
- page: integer, 1-based (default: 1)
- size: integer, page size (default: 20, max: 100)
- status: enum (case-insensitive). Allowed values:
  - ATTIVA: future/today, not cancelled
  - PASSATA: strictly before today, not cancelled
  - CANCELLATA: explicitly cancelled bookings
  - ALL: return all (default). For ALL the server excludes cancelled by default unless includeCanceled=true (legacy compat).
- includeCanceled: boolean (default: false). Only used when status=ALL to preserve legacy behavior. When status=CANCELLATA this flag is ignored.

Response payload
- items: array of bookings with fields
  - id: string (UUID)
  - startDate: string (YYYY-MM-DD)
  - endDate: null (reserved)
  - deskId: string
  - status: string (legacy status e.g., "confirmed")
  - state: string (ATTIVA | PASSATA | CANCELLATA). Always present in server output; computed if missing in DB.
- page: number (echo of query)
- size: number (echo of query)
- total: number (total items for current filter)
- totalPages: number (Math.ceil(total/size), at least 1)
- hasNext: boolean
- hasPrevious: boolean

Business rules and mappings
- Application state vs DB
  - ATTIVA: booking.date >= today (UTC) AND state != 'CANCELLATA'
  - PASSATA: booking.date < today (UTC) AND state != 'CANCELLATA'
  - CANCELLATA: state = 'CANCELLATA' in DB. Past rows marked as cancelled remain CANCELLATA regardless of date.
- Legacy status column (status: 'confirmed' | 'pending') is preserved for UI display but not used for the filter.
- Today/now computations use UTC dates to avoid TZ inconsistencies between clients and server.

Examples
- GET /api/bookings/my?page=1&size=10 -> default ALL, excludes cancelled
- GET /api/bookings/my?page=2&size=10&status=ATTIVA -> only upcoming/today
- GET /api/bookings/my?status=CANCELLATA -> only cancelled

OpenAPI snippet

paths:
  /api/bookings/my:
    get:
      summary: List current user's bookings (paginated)
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: page
          schema: { type: integer, minimum: 1, default: 1 }
        - in: query
          name: size
          schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
        - in: query
          name: status
          schema:
            type: string
            enum: [ATTIVA, PASSATA, CANCELLATA, ALL]
            default: ALL
        - in: query
          name: includeCanceled
          schema: { type: boolean, default: false }
          description: Only applies when status=ALL for legacy compatibility
      responses:
        '200':
          description: Paginated bookings
          content:
            application/json:
              schema:
                type: object
                required: [items, page, size, total, totalPages]
                properties:
                  items:
                    type: array
                    items:
                      type: object
                      properties:
                        id: { type: string, format: uuid }
                        startDate: { type: string, format: date }
                        endDate: { type: ["string", "null"], format: date }
                        deskId: { type: string }
                        status: { type: string }
                        state: { type: string, enum: [ATTIVA, PASSATA, CANCELLATA] }
                  page: { type: integer }
                  size: { type: integer }
                  total: { type: integer }
                  totalPages: { type: integer }
                  hasNext: { type: boolean }
                  hasPrevious: { type: boolean }
        '401': { description: Unauthorized }

Notes for frontend alignment
- The frontend client uses parameters page and size (1-based) and a status parameter mapped to the same value space used by the backend (ATTIVA, PASSATA, CANCELLATA, ALL). Avoid introducing alternative names like pageSize to keep consistency.
- The previous ListMyBookingsResponse shape is extended with total, totalPages, hasNext, hasPrevious for richer pagination UX. Clients should handle both the new and old shape for backward compatibility.
