import React, { Suspense, useEffect } from 'react';
import AppProviders from './AppProviders';
import { RouterProvider, useCurrentPath, useRouter } from './lib/router';
// Lazy load main dashboard and bookings sections for faster initial paint
const MapDashboard = React.lazy(() =>
  import('./components/dashboard/Dashboard').then((m) => ({ default: m.Dashboard }))
);
const MyBookings = React.lazy(() =>
  import('./components/bookings/MyBookings').then((m) => ({ default: m.MyBookings }))
);
import { BottomNavigation } from './components/navigation/BottomNavigation';

function Routes() {
  const path = useCurrentPath();
  const { navigate } = useRouter();

  // Normalize legacy/entry routes to the new canonical ones
  useEffect(() => {
    if (path === '/') {
      navigate('/dashboard/mappa');
      return;
    }
    if (path === '/dashboard') {
      navigate('/dashboard/mappa');
      return;
    }
  }, [path, navigate]);

  // Prefetch the alternate section to make transitions snappy
  useEffect(() => {
    if (path.startsWith('/dashboard/mappa')) {
      // Warm up bookings chunk in background
      import('./components/bookings/MyBookings');
    } else if (path.startsWith('/dashboard/prenotazioni') || path.startsWith('/le-mie-prenotazioni')) {
      // Warm up map dashboard chunk in background
      import('./components/dashboard/Dashboard');
    }
  }, [path]);

  const contentPadding = { paddingBottom: 72 } as React.CSSProperties;

  const renderContent = () => {
    // New canonical routes
    if (path.startsWith('/dashboard/prenotazioni') || path.startsWith('/le-mie-prenotazioni')) {
      return (
        <div style={contentPadding}>
          <MyBookings />
        </div>
      );
    }

    // Map dashboard (default within /dashboard)
    if (path.startsWith('/dashboard/mappa') || path.startsWith('/dashboard')) {
      return (
        <div style={contentPadding}>
          <MapDashboard />
        </div>
      );
    }

    // Fallback 404 within app layout
    return (
      <div style={contentPadding}>
        <div style={{ padding: 16 }}>
          <h3>Pagina non trovata</h3>
          <p>La pagina richiesta non esiste. Torna alla dashboard mappa.</p>
          <button onClick={() => navigate('/dashboard/mappa')}>Vai alla mappa</button>
        </div>
      </div>
    );
  };

  return <Suspense fallback={<div style={{ padding: 16 }}>Caricamento…</div>}>{renderContent()}</Suspense>;
}

function Navigation() {
  const { navigate } = useRouter();
  return <BottomNavigation onNavigate={(href) => navigate(href)} />;
}

export const App: React.FC = () => {
  return (
    <AppProviders>
      <RouterProvider>
        <Routes />
        <Navigation />
      </RouterProvider>
    </AppProviders>
  );
};

export default App;
