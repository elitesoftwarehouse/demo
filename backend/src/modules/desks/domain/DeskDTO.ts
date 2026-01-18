// DTOs and enums for Desk (Postazione) status API
// Mapping of states (must be consistent with front-end labels/colors):
// - LIBERA: the desk is free/available
// - OCCUPATA: the desk is currently occupied
// - NON_DISPONIBILE: the desk is out of service or not reservable

export type DeskState = 'LIBERA' | 'OCCUPATA' | 'NON_DISPONIBILE';

export interface DeskStatusDTO {
  id: string; // stable id, e.g., "desk-1".."desk-12"
  label: string; // human label, e.g., "Postazione 1"
  status: DeskState;
  updatedAt: string; // ISO timestamp
  meta?: Record<string, any>; // optional metadata, e.g., sensor id, notes
}
