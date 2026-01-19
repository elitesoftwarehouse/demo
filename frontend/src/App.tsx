import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './auth/auth';
import CoworkingPage from './pages/CoworkingPage';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Benvenuto{user?.name ? `, ${user?.name}` : ''}</h2>
      <p>Ruolo: {user?.role || 'N/D'}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/coworking')} style={{ padding: '8px 12px' }}>
          Vai a Prenotazione coworking
        </button>
        <button onClick={logout} style={{ padding: '8px 12px' }}>Logout</button>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/coworking"
            element={
              <RequireAuth>
                <CoworkingPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
