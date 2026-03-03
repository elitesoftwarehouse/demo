import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// BottomNavigation - persistent bottom bar with primary app destinations
// Items: Mappa (/dashboard/mappa) and Le mie prenotazioni (/dashboard/prenotazioni)
// Accessibility: role="navigation", aria-label, NavLink with aria-current on active

export type BottomNavigationProps = {
  style?: React.CSSProperties;
  className?: string;
};

const barStyle: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  background: '#111827', // gray-900
  color: '#F9FAFB', // gray-50
  borderTop: '1px solid #374151', // gray-700
  padding: '8px max(env(safe-area-inset-left, 0px), 12px) calc(8px + env(safe-area-inset-bottom, 0px)) max(env(safe-area-inset-right, 0px), 12px)',
  zIndex: 100,
};

const listStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
  alignItems: 'stretch',
};

const itemBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 48,
  minHeight: 44, // touch target
  borderRadius: 12,
  textDecoration: 'none',
  fontSize: 14,
  lineHeight: '20px',
  padding: '0 12px',
  outlineOffset: 2,
};

const activeStyle: React.CSSProperties = {
  background: '#2563EB', // blue-600
  color: '#ffffff',
};

const inactiveStyle: React.CSSProperties = {
  background: '#1F2937', // gray-800
  color: '#E5E7EB', // gray-200
};

const iconStyle: React.CSSProperties = { fontSize: 18 };

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const BottomNavigation: React.FC<BottomNavigationProps> = ({ style, className }) => {
  const location = useLocation();
  const current = location.pathname;
  const search = location.search;

  const items = [
    { to: '/dashboard/mappa', label: 'Mappa', icon: '🗺️' },
    { to: '/dashboard/prenotazioni', label: "Le mie prenotazioni", icon: '📋' },
  ];

  return (
    <nav role="navigation" aria-label="Navigazione principale" style={{ ...barStyle, ...style }} className={className}>
      <ul style={listStyle}>
        {items.map((item) => {
          const isActive = current === item.to || (item.to !== '/' && current.startsWith(item.to));
          return (
            <li key={item.to} style={{ listStyle: 'none' }}>
              <NavLink
                to={{ pathname: item.to, search }}
                style={{ ...itemBase, ...(isActive ? activeStyle : inactiveStyle) }}
                aria-label={item.label}
              >
                <span aria-hidden="true" style={iconStyle}>{item.icon}</span>
                <span>{item.label}</span>
                {/* Ensure touch target is large and accessible screen reader label */}
                <span style={srOnly}>{isActive ? ' (selezionato)' : ''}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNavigation;
