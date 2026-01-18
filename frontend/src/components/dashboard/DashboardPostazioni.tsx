import React, { useMemo, useCallback } from 'react';
import { DeskMapView, DeskItem, BookingPreview } from './DeskMapView';
import { Container, Title, SubTitle } from './styles';
import { useDeskOverrides } from '../../lib/desksState';

export interface DashboardPostazioniProps {
  // Full list of desks for the current floor/area
  desks: DeskItem[];
  // Selected date provided by parent context (e.g., from a datepicker); optional -> defaults to today
  selectedDate?: Date | string;
  // Event raised when a user selects a free desk
  onPreviewBooking?: (preview: BookingPreview, desk: DeskItem) => void;
}

function mapFromApiStatus(status?: 'FREE' | 'OCCUPIED' | 'UNAVAILABLE'): DeskItem['status'] | undefined {
  if (!status) return undefined;
  switch (status) {
    case 'FREE':
      return 'LIBERA';
    case 'OCCUPIED':
      return 'OCCUPATA';
    case 'UNAVAILABLE':
      return 'NON_DISPONIBILE';
    default:
      return undefined;
  }
}

export const DashboardPostazioni: React.FC<DashboardPostazioniProps> = ({ desks, selectedDate, onPreviewBooking }) => {
  // Pull real-time overrides for the selected date (if any) and map them to local status enum
  const overrides = useDeskOverrides(selectedDate);

  const desksWithRealtime = useMemo(() => {
    if (!overrides || Object.keys(overrides).length === 0) return desks;
    return desks.map((d) => {
      const override = overrides[d.id];
      if (!override) return d;
      const mapped = mapFromApiStatus(override as any);
      return mapped ? { ...d, status: mapped } : d;
    });
  }, [desks, overrides]);

  const freeCount = useMemo(() => desksWithRealtime.filter((d) => d.status === 'LIBERA').length, [desksWithRealtime]);

  const handleDeskSelected = useCallback(
    (desk: DeskItem, date: Date, preview: BookingPreview) => {
      // Propagate to parent; parent will open the popup modal with provided preview data
      onPreviewBooking?.(preview, desk);
    },
    [onPreviewBooking]
  );

  return (
    <Container>
      <Title>Seleziona una postazione</Title>
      <SubTitle>
        {freeCount > 0 ? `${freeCount} postazioni libere` : 'Nessuna postazione libera'}
      </SubTitle>

      <DeskMapView desks={desksWithRealtime} selectedDate={selectedDate} onDeskSelected={handleDeskSelected} />
    </Container>
  );
};

export default DashboardPostazioni;
