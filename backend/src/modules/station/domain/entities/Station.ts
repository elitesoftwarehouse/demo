// Domain entity and types for Station (desk) status used by dashboard
// Mapping must be consistent with frontend labels
// Frontend expects statuses: 'FREE' | 'OCCUPIED' | 'UNAVAILABLE'

export type StationStatus = 'FREE' | 'OCCUPIED' | 'UNAVAILABLE';

export interface Station {
  id: string;
  name: string; // readable label, e.g., "Postazione 1"
  status: StationStatus;
  updatedAt?: Date; // optional metadata: last update timestamp
}

export interface StationStatusDTO {
  id: string;
  name: string;
  status: StationStatus;
  updatedAt?: string; // ISO string for transport
}

// Helper to map domain -> DTO
export function toStationDTO(s: Station): StationStatusDTO {
  return {
    id: s.id,
    name: s.name,
    status: s.status,
    updatedAt: s.updatedAt ? s.updatedAt.toISOString() : undefined,
  };
}
