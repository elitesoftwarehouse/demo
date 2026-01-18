// Domain types for Desks (postazioni)
// Keep it simple: three states with stable string enums

export type DeskStatus = 'FREE' | 'OCCUPIED' | 'UNAVAILABLE';

export interface Desk {
  id: string; // stable id like D1..D12
  name: string;
  status: DeskStatus;
}

export const DESK_STATUS: DeskStatus[] = ['FREE', 'OCCUPIED', 'UNAVAILABLE'];

export const DeskStatusLabel: Record<DeskStatus, string> = {
  FREE: 'Libero',
  OCCUPIED: 'Occupato',
  UNAVAILABLE: 'Non disponibile',
};
