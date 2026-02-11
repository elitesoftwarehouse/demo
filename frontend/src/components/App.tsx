import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import AppRouter from '../router/AppRouter';

export const App: React.FC<{ baseUrl?: string }> = ({ baseUrl = '/api' }) => {
  return (
    <AuthProvider baseUrl={baseUrl}>
      <AppRouter baseUrl={baseUrl} />
    </AuthProvider>
  );
};

export default App;
