import React, { useEffect, useMemo, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthPage from '../components/Auth/AuthPage';
import { useAuthContext } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import { DashboardShell } from '../components/Dashboard/DashboardShell';

// Lazy-loaded pages for faster initial paint
const DashboardPageLazy = React.lazy(() =>
  import('../components/Dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const MyBookingsPageLazy = React.lazy(() =>
  import('../components/Bookings/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })),
);

// Wrapper around AuthPage that handles redirection if already authenticated
const AuthPageWrapper: React.FC<{ baseUrl?: string }> = ({ baseUrl = '/api' }) => {
  const { state } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation() as any;

  // If already logged in, redirect to dashboard map
  if (state.isAuthenticated) {
    return <Navigate to="/dashboard/mappa" replace />;
  }

  const onSuccess = () => {
    // after successful login, redirect to previous requested route if provided
    const from = location?.state?.from?.pathname || '/dashboard/mappa';
    navigate(from, { replace: true });
  };

  return <AuthPage baseUrl={baseUrl} onSuccess={onSuccess} />;
};

export type AppRouterProps = { baseUrl?: string };

export const AppRouter: React.FC<AppRouterProps> = ({ baseUrl = '/api' }) => {
  const { state } = useAuthContext();
  const routerBase = useMemo(() => ({ baseUrl }), [baseUrl]);

  // Prefetch the secondary screens after mount to reduce perceived latency on tab switch
  useEffect(() => {
    // Fire-and-forget dynamic imports (browser may use low priority)
    import('../components/Bookings/MyBookingsPage');
    import('../components/Dashboard/DashboardPage');
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<AuthPageWrapper baseUrl={routerBase.baseUrl} />} />

        {/* Legacy redirects to new dashboard routes */}
        <Route path="/" element={<Navigate to="/dashboard/mappa" replace />} />
        <Route path="/bookings" element={<Navigate to="/dashboard/prenotazioni" replace />} />

        {/* Protected area with persistent layout and bottom navigation */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardShell />
            </ProtectedRoute>
          }
        >
          {/* Default inside dashboard: map */}
          <Route index element={<Navigate to="mappa" replace />} />

          <Route
            path="mappa"
            element={
              <Suspense fallback={<div>Caricamento…</div>}>
                <DashboardPageLazy baseUrl={routerBase.baseUrl} />
              </Suspense>
            }
          />

          <Route
            path="prenotazioni"
            element={
              <Suspense fallback={<div>Caricamento…</div>}>
                <MyBookingsPageLazy />
              </Suspense>
            }
          />

          {/* Fallback unknown routes within the dashboard to map */}
          <Route path="*" element={<Navigate to="mappa" replace />} />
        </Route>

        {/* Global fallback: redirect unknown routes based on auth state */}
        <Route
          path="*"
          element={<Navigate to={state.isAuthenticated ? '/dashboard/mappa' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
