import { Navigate } from 'react-router-dom';
import { authUtils } from '../lib/auth';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = authUtils.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}