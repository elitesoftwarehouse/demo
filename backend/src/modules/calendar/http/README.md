Calendar Module - Coworking Closures

Purpose
- Provide a business service to determine if a specific date is closed for the coworking
- Support single-day closures, weekly recurring closures (e.g., weekends), and annual recurring dates (e.g., holidays)

DB Model
- Migration 005__create_coworking_closures.sql creates table coworking_closures with columns:
  - id (UUID), type (SINGLE|WEEKLY|ANNUAL), date (for single), weekday (0..6), month (1..12), month_day (1..31)
  - reason (string), active (bool), start_date, end_date, created_at, updated_at
  - default seeds for weekend (Saturday, Sunday)

Service
- ClosureService(repo).isGiornoChiuso(date) => { closed: boolean, reason?: string }
- Repository interface IClosureRepository with findActiveClosures(at?: Date)

Integration
- Booking API can call ClosureService.isGiornoChiuso(date) before confirming a reservation
- For projects using Prisma/SQL, implement a repository adapter for IClosureRepository querying coworking_closures
