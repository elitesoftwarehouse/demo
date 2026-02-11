import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export type ProtectedRouteProps = {
  children: React.ReactElement;
  redirectTo?: string; // login path
  allowWhen?: (isAuthenticated: boolean) => boolean; // optional custom predicate
};

/**
 * ProtectedRoute guards access to children routes based on AuthContext state.
 * - If not authenticated, redirects to login and preserves the original location in state.
 * - If authenticated, renders children.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
  allowWhen,
}) => {
  const { state } = useAuthContext();
  const location = useLocation();

  const isAllowed = allowWhen ? allowWhen(state.isAuthenticated) : state.isAuthenticated;

  if (!isAllowed) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
