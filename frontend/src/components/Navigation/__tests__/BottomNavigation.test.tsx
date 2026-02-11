import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BottomNavigation } from '../BottomNavigation';

// Helper to render with router and show current location for assertions
function renderWithRouter(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/dashboard/*"
          element={
            <div>
              <BottomNavigation basePath="/dashboard" />
              <div data-testid="location-display" />
            </div>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BottomNavigation', () => {
  test('renders items Mappa and Le mie prenotazioni', () => {
    renderWithRouter(['/dashboard/mappa']);
    expect(screen.getByRole('link', { name: 'Mappa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Le mie prenotazioni' })).toBeInTheDocument();
  });

  test('sets active state based on current route', () => {
    renderWithRouter(['/dashboard/mappa']);
    const mapLink = screen.getByRole('link', { name: 'Mappa' });
    const bookingsLink = screen.getByRole('link', { name: 'Le mie prenotazioni' });

    // NavLink sets aria-current="page" for the active item
    expect(mapLink).toHaveAttribute('aria-current', 'page');
    expect(bookingsLink).not.toHaveAttribute('aria-current');
  });

  test('navigates to the correct route on click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard/mappa?date=2025-02-01"]}>
        <Routes>
          <Route path="/dashboard/mappa" element={<div>MAP</div>} />
          <Route path="/dashboard/prenotazioni" element={<div>BOOKINGS</div>} />
          <Route
            path="/dashboard/*"
            element={
              <div>
                <BottomNavigation basePath="/dashboard" />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // Initially on MAP
    expect(screen.getByRole('link', { name: 'Mappa' })).toHaveAttribute('aria-current', 'page');

    // Click bookings
    await user.click(screen.getByRole('link', { name: 'Le mie prenotazioni' }));

    // Now bookings should be active (aria-current set)
    expect(screen.getByRole('link', { name: 'Le mie prenotazioni' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
