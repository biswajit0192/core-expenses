import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute() {
  const { currentUser, loading } = useAuth();

  // Wait for auth state to initialize
  if (loading) {
    return null; 
  }

  if (!currentUser) {
    return <Navigate to="/welcome" replace />;
  }

  return <Outlet />;
}

