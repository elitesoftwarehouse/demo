import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import CoworkingBookingPage from './pages/CoworkingBookingPage';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 16 }}>
      <h2>Benvenuto{user?.name ? `, ${user.name}` : ''}</h2>
      <p>Ruolo: {user?.role || 'USER'}</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <a href="/coworking" style={{ padding: 10, background: '#0ea5e9', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>Prenotazione coworking</a>
        <button onClick={logout} style={{ padding: 10, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8 }}>Logout</button>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { accessToken } = useAuth();
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coworking"
            element={
              <ProtectedRoute>
                <CoworkingBookingPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
