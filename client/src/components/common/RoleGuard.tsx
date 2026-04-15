import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const RoleGuard = ({ requiredRole }: { requiredRole: string }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== requiredRole && user?.role !== 'admin') return <Navigate to="/" replace />;
  
  return <Outlet />;
};
