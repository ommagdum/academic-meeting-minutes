// In OAuthRedirect.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Helper to set cookie with proper format
const setCookie = (name: string, value: string) => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const cookieParts = [
    `${name}=${encodeURIComponent(value)}`,
    'path=/',
    'SameSite=Strict'
  ];
  
  if (!isLocalhost) {
    cookieParts.push('Secure');
  }
  
  document.cookie = cookieParts.join('; ');
};

const OAuthRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const completeLogin = useCallback(async () => {
    try {
      console.log('[OAuth] Processing redirect...', {
        url: window.location.href,
        searchParams: Object.fromEntries(searchParams.entries())
      });

      // Check for error from OAuth provider
      const errorParam = searchParams.get('error');
      if (errorParam) {
        console.error('[OAuth] Error from OAuth provider:', errorParam);
        throw new Error(errorParam);
      }

      // Check if we have an access token in the URL
      // Note: Ideally, backend should set HTTP-only cookies and redirect here
      // But if token is in URL, we'll handle it
      const token = searchParams.get('token');
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      
      console.log('[OAuth] URL parameters:', { token: !!token, code: !!code, state: !!state });

      if (token) {
        console.log('[OAuth] Token found in URL, validating and storing...');
        
        // Validate token format (should have at least 2 dots for JWT)
        if (!token.includes('.')) {
          throw new Error('Invalid token format');
        }
        
        // Store the token using authService to ensure consistency
        localStorage.setItem('auth_token', token);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Clean up the URL by removing the token
        const cleanUrl = window.location.origin + window.location.pathname;
        const returnTo = searchParams.get('returnTo') || '/dashboard';
        
        // Remove token from URL for security
        const cleanSearchParams = new URLSearchParams(searchParams);
        cleanSearchParams.delete('token');
        
        const newUrl = cleanSearchParams.toString() 
          ? `${cleanUrl}?${cleanSearchParams.toString()}`
          : cleanUrl;
          
        window.history.replaceState({}, document.title, newUrl);
        
        // Store the return URL and redirect
        if (returnTo && returnTo !== '/') {
          localStorage.setItem('redirectAfterLogin', returnTo);
        }
        
        console.log('[OAuth] Token stored and URL cleaned');
      } else if (code || state) {
        // Backend redirected with OAuth code/state - backend should have set HTTP-only cookie
        console.log('[OAuth] OAuth code/state found - backend should have set cookie');
        // Set auth flag optimistically
        localStorage.setItem('auth_token', 'active');
      } else {
        // No token, code, or state - backend might have just set HTTP-only cookie
        console.log('[OAuth] No token/code/state in URL - checking if backend set HTTP-only cookie');
        // Set auth flag optimistically
        localStorage.setItem('auth_token', 'active');
      }

      // Verify the authentication with the backend
      // Backend should have set HTTP-only cookie during OAuth flow
      console.log('[OAuth] Verifying authentication with backend...');
      const user = await checkAuth(true);
      
      if (user) {
        console.log('[OAuth] Authentication successful, redirecting...', { user: user.email });
        // Redirect to dashboard or return URL
        // Check URL params first, but ignore if it's just '/' (root)
        const urlReturnTo = searchParams.get('returnTo');
        const storedReturnTo = localStorage.getItem('redirectAfterLogin');
        
        // Use stored returnTo if URL returnTo is empty or just root
        const returnTo = (urlReturnTo && urlReturnTo !== '/' && urlReturnTo !== '/auth') 
          ? urlReturnTo 
          : (storedReturnTo && storedReturnTo !== '/' && storedReturnTo !== '/auth')
            ? storedReturnTo
            : '/dashboard';
        
        localStorage.removeItem('redirectAfterLogin');
        console.log('[OAuth] Redirecting to:', returnTo);
        navigate(returnTo, { replace: true });
      } else {
        console.error('[OAuth] Authentication verification failed - no user data');
        throw new Error('Authentication failed: No user data received from backend. Please try logging in again.');
      }
    } catch (err) {
      console.error('[OAuth] Redirect error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      
      // Clear auth state on error
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, searchParams, checkAuth]);

  useEffect(() => {
    completeLogin();
  }, [completeLogin]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => window.location.href = '/auth'}>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default OAuthRedirect;