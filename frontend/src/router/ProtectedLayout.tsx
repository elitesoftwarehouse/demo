import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import { SelectedDateProvider } from '../context/SelectedDateContext';

// ProtectedLayout: wraps protected pages with persistent bottom navigation
// The bottom nav is fixed; we add bottom padding to avoid overlap with page content.

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  paddingBottom: 80, // space for bottom nav (approx 56-64px + spacing)
  background: '#F9FAFB', // gray-50 background as app guideline
};

const ProtectedLayout: React.FC = () => {
  // Lightweight prefetch of the two primary sections to improve perceived latency
  React.useEffect(() => {
    const prefetch = () => {
      // Fire-and-forget dynamic imports. Bundlers will prefetch/chunk accordingly.
      import('../pages/DashboardPostazioni').catch(() => void 0);
      import('../pages/MyBookingsPage').catch(() => void 0);
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetch);
    } else {
      const id = window.setTimeout(prefetch, 150);
      return () => window.clearTimeout(id);
    }
  }, []);

  return (
    <div style={containerStyle}>
      <SelectedDateProvider>
        {/* Lazy-loaded routes render here with a small loading fallback */}
        <React.Suspense fallback={<div style={{ padding: '1rem' }}>Caricamento…</div>}>
          <Outlet />
        </React.Suspense>
        <BottomNavigation />
      </SelectedDateProvider>
    </div>
  );
};

export default ProtectedLayout;
