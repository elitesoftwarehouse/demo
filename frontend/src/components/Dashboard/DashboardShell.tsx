import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigation from '../Navigation/BottomNavigation';

/**
 * DashboardShell renders the outlet area and a persistent bottom navigation.
 * It must not trigger full reloads and relies on SPA routing.
 */
export const DashboardShell: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <Outlet />
      </div>
      <BottomNavigation basePath="/dashboard" />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#f9fafb',
  },
  content: {
    flex: 1,
    paddingBottom: 56, // reserve space for bottom nav
  },
};

export default DashboardShell;
