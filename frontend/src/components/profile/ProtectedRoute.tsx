import React from 'react';
import { useAuth } from '../../lib/authContext';

export function ProtectedRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <>{fallback ?? <div style={{ padding: 16 }}>Please login to continue.</div>}</>;
  return <>{children}</>;
}

export default ProtectedRoute;
