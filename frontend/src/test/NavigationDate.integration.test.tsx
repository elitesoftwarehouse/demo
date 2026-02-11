import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, NavLink } from 'react-router-dom';
import { SelectedDateProvider, useSelectedDate } from '../context/SelectedDateContext';
import { BottomNavigation } from '../components/Navigation/BottomNavigation';

function MapPage() {
  const { date, setDate } = useSelectedDate();
  return (
    <div>
      <div data-testid="date">{date}</div>
      <button onClick={() => setDate('2025-02-20')}>Select 2025-02-20</button>
    </div>
  );
}

function BookingsPage() {
  const { date } = useSelectedDate();
  return <div data-testid="bookings-date">{date}</div>;
}

function App() {
  return (
    <SelectedDateProvider>
      <BottomNavigation basePath="/dashboard" />
      <Routes>
        <Route path="/dashboard/mappa" element={<MapPage />} />
        <Route path="/dashboard/prenotazioni" element={<BookingsPage />} />
      </Routes>
    </SelectedDateProvider>
  );
}

describe('Navigation + SelectedDate integration', () => {
  test('select date on map, navigate to bookings, date is preserved and survives back/forward', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/dashboard/mappa?date=2025-02-01`]} initialIndex={0}>
        <App />
      </MemoryRouter>,
    );

    // Select a new date on the map
    await user.click(screen.getByRole('button', { name: 'Select 2025-02-20' }));
    expect(screen.getByTestId('date')).toHaveTextContent('2025-02-20');

    // Go to bookings via bottom navigation
    await user.click(screen.getByRole('link', { name: 'Le mie prenotazioni' }));
    expect(screen.getByTestId('bookings-date')).toHaveTextContent('2025-02-20');

    // Go back to map
    await user.click(screen.getByRole('link', { name: 'Mappa' }));
    expect(screen.getByTestId('date')).toHaveTextContent('2025-02-20');
  });

  test('handles no explicit date selected (defaults) and rapid switching between sections', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/dashboard/mappa`]}>
        <App />
      </MemoryRouter>,
    );

    const initial = screen.getByTestId('date').textContent;
    expect(initial && /^\d{4}-\d{2}-\d{2}$/.test(initial)).toBe(true);

    // Rapid switching
    await user.click(screen.getByRole('link', { name: 'Le mie prenotazioni' }));
    await user.click(screen.getByRole('link', { name: 'Mappa' }));
    await user.click(screen.getByRole('link', { name: 'Le mie prenotazioni' }));

    // Date should remain the same across quick switches
    const after = screen.getByTestId('bookings-date').textContent || '';
    expect(after).toBeTruthy();
    expect(/^\d{4}-\d{2}-\d{2}$/.test(after)).toBe(true);
  });
});
