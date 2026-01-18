import React from 'react';
import { useRouter, Link } from '../../lib/router';
import { useSelectedDate } from '../../lib/date/SelectedDateContext';

export interface BottomNavigationProps {
  onNavigate?: (href: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ onNavigate }) => {
  const { navigate, currentPath } = useRouter() as any;
  const { date } = useSelectedDate();

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    onNavigate && onNavigate(href);
  };

  const mkHref = (base: string) => {
    const u = new URL(window.location.origin + base);
    if (date) u.searchParams.set('date', date);
    return u.pathname + u.search;
  };

  const mapHref = mkHref('/dashboard/mappa');
  const bookingsHref = mkHref('/dashboard/prenotazioni');

  const isOnMap = currentPath?.startsWith('/dashboard/mappa') || currentPath?.startsWith('/dashboard');
  const isOnBookings = currentPath?.startsWith('/dashboard/prenotazioni') || currentPath?.startsWith('/le-mie-prenotazioni');

  return (
    <nav className="sd-bottom-nav" role="navigation" aria-label="Navigazione">
      <Link href={mapHref} onClick={go(mapHref)} aria-current={isOnMap ? 'page' : undefined}>
        Mappa
      </Link>
      <Link href={bookingsHref} onClick={go(bookingsHref)} aria-current={isOnBookings ? 'page' : undefined}>
        Le mie prenotazioni
      </Link>
    </nav>
  );
};
