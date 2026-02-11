import React from 'react';
import { NavLink } from 'react-router-dom';

export type BottomNavigationProps = {
  basePath?: string;
};

/**
 * Persistent bottom navigation bar for main app areas.
 * - Accessible with role=navigation and aria-label
 * - Uses NavLink to reflect active route state
 * - Touch-friendly minimum sizes
 */
export const BottomNavigation: React.FC<BottomNavigationProps> = ({ basePath = '/dashboard' }) => {
  const items = [
    { key: 'map', label: 'Mappa', to: `${basePath}/mappa` },
    { key: 'bookings', label: 'Le mie prenotazioni', to: `${basePath}/prenotazioni` },
  ];

  return (
    <nav aria-label="Navigazione principale" role="navigation" style={styles.nav}>
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          aria-label={item.label}
          end={item.to.endsWith('/mappa')}
          style={({ isActive }) => ({
            ...styles.link,
            ...(isActive ? styles.linkActive : {}),
          })}
        >
          <span style={styles.linkLabel}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    background: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    zIndex: 100,
  },
  link: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    color: '#374151',
    fontSize: 14,
    padding: '12px 8px',
    // Ensure touch target size
    minWidth: 80,
  },
  linkActive: {
    color: '#2563eb',
    fontWeight: 600,
  },
  linkLabel: {
    lineHeight: 1,
  },
};

export default BottomNavigation;
