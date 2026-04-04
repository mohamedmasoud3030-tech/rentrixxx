import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

interface ProtectedRouteProps {
  capability: string;
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ capability, children }) => {
  const { auth, canAccess } = useApp();

  if (auth.isInitializing) {
    return null;
  }

  if (!auth.currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccess(capability)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
