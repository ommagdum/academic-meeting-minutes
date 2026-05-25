import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '@/services/authService';
import { toast } from '@/components/ui/use-toast';
import { User } from '@/types/user';
import { AuthProvider, AuthContextType } from '@/types/auth';
import { Loader2 } from 'lucide-react';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<AuthProvider>(authService.getProvider());
  const isMounted = useRef(true);
  const isCheckingAuth = useRef(false);
  const authCheckPromise = useRef<Promise<User | null> | null>(null);
  const initialMount = useRef(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const login = useCallback((googleProvider: 'google') => {
    authService.login(googleProvider);
  }, []);

  // ─── Credential-based register ────────────────────────────────────────────────
  const register = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      const userData = await authService.register(name, email, password);
      setUser(userData);
      setProvider('local');
      const returnTo = localStorage.getItem('redirectAfterLogin') || '/dashboard';
      localStorage.removeItem('redirectAfterLogin');
      navigate(returnTo, { replace: true });
      toast({ title: 'Account created', description: `Welcome, ${userData.name}!` });
    },
    [navigate],
  );

  // ─── Credential-based login ───────────────────────────────────────────────────
  const loginWithCredentials = useCallback(
    async (email: string, password: string): Promise<void> => {
      const userData = await authService.loginWithCredentials(email, password);
      setUser(userData);
      setProvider('local');
      const returnTo =
        localStorage.getItem('redirectAfterLogin') ||
        localStorage.getItem('pendingRedirect') ||
        '/dashboard';
      localStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('pendingRedirect');
      navigate(returnTo, { replace: true });
      toast({ title: 'Welcome back', description: `Signed in as ${userData.email}` });
    },
    [navigate],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      setProvider(null);
      navigate('/auth');
      toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'There was an error logging out. Please try again.',
        variant: 'destructive',
      });
    }
  }, [navigate]);

  const checkAuth = useCallback(
    async (force = false): Promise<User | null> => {
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

          if (!isMounted.current) return null;

          if (userData) {
            setUser(userData);
            // Restore provider from storage if not already set
            setProvider((prev) => prev ?? authService.getProvider());

            // Handle OAuth callback success
            const searchParams = new URLSearchParams(location.search);
            if (searchParams.has('success') && searchParams.get('success') === 'true') {
              const returnTo = searchParams.get('returnTo') || '/dashboard';
              navigate(returnTo, { replace: true });
              return userData;
            }

            // If there's a pending join token, handle it
            const pendingJoinToken = localStorage.getItem('pendingJoinToken');
            if (pendingJoinToken) {
              localStorage.removeItem('pendingJoinToken');
              navigate(`/meetings/join?token=${pendingJoinToken}`, {
                replace: true,
                state: { fromLogin: true },
              });
              return userData;
            }

            // Redirect from auth page if already authenticated
            if (location.pathname === '/auth' || location.pathname === '/login') {
              const returnTo = localStorage.getItem('redirectAfterLogin') || '/dashboard';
              localStorage.removeItem('redirectAfterLogin');
              if (returnTo && returnTo !== '/' && returnTo !== '/auth') {
                if (returnTo.includes('/meetings/join')) {
                  const url = new URL(window.location.origin + returnTo);
                  const token = url.searchParams.get('token');
                  if (token) {
                    navigate(`/meetings/join?token=${token}`, {
                      replace: true,
                      state: { fromLogin: true },
                    });
                    return userData;
                  }
                }
                navigate(returnTo, { replace: true });
              } else {
                navigate('/dashboard', { replace: true });
              }
            }

            return userData;
          }

          setUser(null);
          return null;
        } catch (error) {
          console.error('[Auth] Error in checkAuth:', error);
          setUser(null);

          if (
            !location.pathname.startsWith('/auth') &&
            !location.pathname.startsWith('/login') &&
            !location.pathname.startsWith('/oauth2')
          ) {
            navigate(`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`, {
              replace: true,
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
    },
    [user, location, navigate],
  );

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      checkAuth(true);
    }

    const unlisten = () => {
      if (!isLoading && !user) {
        checkAuth();
      }
    };

    return unlisten;
  }, [checkAuth, isLoading, user, location.pathname]);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    provider,
    login,
    loginWithCredentials,
    register,
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

export { AuthContext };
export type { AuthContextType };