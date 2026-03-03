import React from 'react';
import DatePickerWithDisabled from '../components/DatePickerWithDisabled';

// Simple booking page demo integrating the DatePickerWithDisabled
// It shows the picker and current selected date. In real app, this would proceed
// to select station/time and confirm.

const BookingPage: React.FC = () => {
  const [date, setDate] = React.useState<Date | null>(null);

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Prenotazione coworking</h1>
      <p style={{ color: '#6b7280', fontSize: 14 }}>Seleziona una data disponibile. Le domeniche e le festività risultano bloccate automaticamente.</p>

      <div style={{ maxWidth: 360 }}>
        <DatePickerWithDisabled value={date} onChange={setDate} />
      </div>

      <div style={{ marginTop: '1rem', fontSize: 14 }}>
        Data selezionata: {date ? date.toLocaleDateString('it-IT') : '—'}
      </div>
    </div>
  );
};

export default BookingPage;
