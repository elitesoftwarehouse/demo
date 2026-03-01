import React, { useState } from 'react';
import { DatePicker } from '../components/DatePicker';

export const BookingPage: React.FC = () => {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <section style={{ padding: 16 }}>
      <h1>Prenotazione coworking</h1>
      <p>Seleziona una data. Le domeniche e le festività risultano disabilitate.</p>
      <DatePicker value={date} onChange={setDate} />
      {date && (
        <p style={{ marginTop: 12 }}>
          Data selezionata: <strong>{date.toLocaleDateString()}</strong>
        </p>
      )}
    </section>
  );
};
