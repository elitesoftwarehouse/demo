import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth, AuthProvider } from '../context/AuthContext';
import ProtectedLayout from './ProtectedLayout';

// Lazy-loaded pages for faster initial paint and smoother transitions
const DashboardMapPage = React.lazy(() => import('../pages/DashboardPostazioni'));
const MyBookingsPage = React.lazy(() => import('../pages/MyBookingsPage'));
const BookingPage = React.lazy(() => import('../pages/BookingPage'));
const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));

// Placeholder pages: in a real app, replace with actual components
const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/dashboard/mappa';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard/mappa', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleMockLogin = () => {
    login({
      tokens: { accessToken: 'mock-access', refreshToken: 'mock-refresh' },
      user: { id: '1', email: 'mock@example.com' },
    });
    // Preserve current query (e.g., date) on redirect
    navigate(from + window.location.search, { replace: true });
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Login</h1>
      <button onClick={handleMockLogin}>Login</button>
    </div>
  );
};

const SignupPage: React.FC = () => {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const redirectTo = location.state?.redirectTo || '/dashboard/mappa';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard/mappa', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleMockSignup = () => {
    signup({
      tokens: { accessToken: 'mock-access', refreshToken: 'mock-refresh' },
      user: { id: '2', email: 'new@example.com' },
    });
    navigate(redirectTo + window.location.search, { replace: true });
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Signup</h1>
      <button onClick={handleMockSignup}>Create account</button>
    </div>
  );
};

// Simple placeholders for demo-only sections
const TimesheetPage: React.FC = () => <div style={{ padding: '1rem' }}><h1>Timesheet</h1></div>;
const ProjectsPage: React.FC = () => <div style={{ padding: '1rem' }}><h1>Projects</h1></div>;

// NotFound route inside protected layout, with quick links to key sections
const NotFoundInApp: React.FC = () => (
  <div style={{ padding: '1rem' }}>
    <h1>Pagina non trovata</h1>
    <p>La pagina richiesta non esiste. Usa le scorciatoie qui sotto per continuare:</p>
    <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Link to={{ pathname: '/dashboard/mappa', search: window.location.search }}>Mappa</Link>
      <Link to={{ pathname: '/dashboard/prenotazioni', search: window.location.search }}>Le mie prenotazioni</Link>
    </nav>
  </div>
);

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard/mappa" replace />} />

    {/* Public routes */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />

    {/* Protected routes wrapper */}
    <Route element={<ProtectedRoute />}> 
      {/* Layout con bottom navigation persistente */}
      <Route element={<ProtectedLayout />}>
        {/* Nuove route dedicate per chiarezza */}
        <Route path="/dashboard/mappa" element={<DashboardMapPage />} />
        <Route path="/dashboard/prenotazioni" element={<MyBookingsPage />} />
        {/* Alias richiesto: /le-mie-prenotazioni → protegge e reindirizza alla sezione */}
        <Route path="/le-mie-prenotazioni" element={<Navigate to="/dashboard/prenotazioni" replace />} />

        {/* Backward compatibility redirects */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/mappa" replace />} />
        <Route path="/my-bookings" element={<Navigate to="/dashboard/prenotazioni" replace />} />

        {/* Altre sezioni */}
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/timesheet" element={<TimesheetPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Fallback 404 all'interno dell'app protetta */}
        <Route path="*" element={<NotFoundInApp />} />
      </Route>
    </Route>

    {/* Fallback globale */}
    <Route path="*" element={<Navigate to="/dashboard/mappa" replace />} />
  </Routes>
);

const AppRouter: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default AppRouter;
