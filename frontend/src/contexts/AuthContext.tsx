import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '@/services/authService';
import { toast } from '@/components/ui/use-toast';
import { User } from '@/types/user';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (provider: 'google') => void;
  logout: () => Promise<void>;
  checkAuth: (force?: boolean) => Promise<User | null>;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const isCheckingAuth = useRef(false);
  const authCheckPromise = useRef<Promise<User | null> | null>(null);
  const initialMount = useRef(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const login = useCallback((provider: 'google') => {
    authService.login(provider);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate('/auth');
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'There was an error logging out. Please try again.',
        variant: 'destructive',
      });
    }
  }, [navigate]);

  const checkAuth = useCallback(async (force = false): Promise<User | null> => {
    // Prevent concurrent auth checks unless forced
    if (isCheckingAuth.current && !force && authCheckPromise.current) {
      console.log('[Auth] Check already in progress, waiting for existing check...');
      try {
        return await authCheckPromise.current;
      } catch {
        return user;
      }
    }
    
    isCheckingAuth.current = true;
    setIsLoading(true);
    
    const checkPromise = (async (): Promise<User | null> => {
      try {
        const userData = await authService.checkAuth(force);
        
        if (!isMounted.current) {
          return null;
        }
        
        if (userData) {
          setUser(userData);
          
          // Check for pending join token
          const pendingJoinToken = localStorage.getItem('pendingJoinToken');
          
          // Handle OAuth callback success
          const searchParams = new URLSearchParams(location.search);
          if (searchParams.has('success') && searchParams.get('success') === 'true') {
            const returnTo = searchParams.get('returnTo') || '/dashboard';
            navigate(returnTo, { replace: true });
            return userData;
          }
          
          // If there's a pending join token, handle it
          if (pendingJoinToken) {
            // Clear the token immediately to prevent loops
            localStorage.removeItem('pendingJoinToken');
            
            // Redirect to join the meeting with the token
            navigate(`/meetings/join?token=${pendingJoinToken}`, { 
              replace: true,
              state: { fromLogin: true }
            });
            return userData;
          }
          
          // Redirect from auth page if already authenticated
          if (location.pathname === '/auth') {
            const returnTo = localStorage.getItem('redirectAfterLogin') || '/dashboard';
            localStorage.removeItem('redirectAfterLogin');
            if (returnTo && returnTo !== '/' && returnTo !== '/auth') {
              // Check if the returnTo is a join URL we should handle specially
              if (returnTo.includes('/meetings/join')) {
                const url = new URL(window.location.origin + returnTo);
                const token = url.searchParams.get('token');
                if (token) {
                  navigate(`/meetings/join?token=${token}`, { 
                    replace: true,
                    state: { fromLogin: true }
                  });
                  return userData;
                }
              }
              
              // Normal redirect
              navigate(returnTo, { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }
          
          return userData;
        }
        
        // If we get here, user is not authenticated
        setUser(null);
        return null;
      } catch (error) {
        console.error('[Auth] Error in checkAuth:', error);
        setUser(null);
        
        // Only redirect if not already on auth/OAuth pages
        if (!location.pathname.startsWith('/auth') && !location.pathname.startsWith('/oauth2')) {
          navigate(`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`, { 
            replace: true 
          });
        }
        
        return null;
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          isCheckingAuth.current = false;
        }
      }
    })();
    
    authCheckPromise.current = checkPromise;
    return checkPromise;
  }, [user, location, navigate]);

  // Add effect to check auth on mount and when location changes
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      checkAuth(true); // Force check on mount
    }
    
    // Check auth when location changes
    const unlisten = () => {
      if (!isLoading && !user) {
        checkAuth();
      }
    };
    
    return unlisten;
  }, [checkAuth, isLoading, user, location.pathname]);
  
  // Update the context value to include isAuthenticated
  const contextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

// Export the context and types for use in the useAuth hook
export { AuthContext };
export type { AuthContextType };