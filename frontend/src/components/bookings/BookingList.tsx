import React from 'react';
import { BookingStatusBadge } from './BookingStatusBadge';

interface BookingListProps {
  bookings: any[];
  renderActions?: (booking: any) => React.ReactNode;
}

export const BookingList: React.FC<BookingListProps> = ({ bookings, renderActions }) => {
  if (!bookings || bookings.length === 0) {
    return <div>Nessuna prenotazione presente</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {bookings.map((b) => (
        <div
          key={b.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            padding: 12,
            border: '1px solid #eee',
            borderRadius: 8,
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{b.spaceName || b.serviceName || 'Postazione'}</div>
            <div style={{ fontSize: 14, color: '#555' }}>
              {b.date || b.startAt || b.startDateTime}
            </div>
            <div style={{ marginTop: 6 }}>
              <BookingStatusBadge status={b.status} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {renderActions ? renderActions(b) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookingList;
