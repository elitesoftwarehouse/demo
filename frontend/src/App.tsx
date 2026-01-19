import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './auth/auth';

function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 16 }}>
      <h2>Benvenuto{user?.name ? `, ${user?.name}` : ''}</h2>
      <p>Ruolo: {user?.role || 'N/D'}</p>
      <button onClick={logout} style={{ padding: '8px 12px' }}>Logout</button>
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
