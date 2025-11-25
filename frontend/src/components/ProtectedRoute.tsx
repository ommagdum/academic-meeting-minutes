import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('ProtectedRoute - Auth state:', { isAuthenticated, isLoading, path: location.pathname });

    if (!isLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      // Store the current URL to redirect back after login
      const redirectTo = location.pathname + location.search;
      navigate(`/auth?returnTo=${encodeURIComponent(redirectTo)}`, {
        replace: true,
      });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Add an effect to check auth status when component mounts
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await checkAuth(true); // Force check auth status
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    if (!isAuthenticated && !isLoading) {
      verifyAuth();
    }
  }, [isAuthenticated, isLoading, checkAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};