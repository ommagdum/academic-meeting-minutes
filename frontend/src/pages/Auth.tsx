import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: loginAuth, isAuthenticated, isLoading } = useAuth();
  const redirectUrl = searchParams.get('redirect');

  const login = async (provider: 'google' | 'microsoft') => {
    try {
      const pendingRedirect = redirectUrl || localStorage.getItem('pendingRedirect');
      if (pendingRedirect) {
        localStorage.setItem('redirectAfterLogin', pendingRedirect);
      }
      await loginAuth(provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  useEffect(() => {
    if (!redirectUrl) return;

    // Persist redirect so OAuth callback can honor it
    localStorage.setItem('pendingRedirect', redirectUrl);

    // If redirect is join flow, capture token for auto-join
    try {
      const url = new URL(redirectUrl, window.location.origin);
      if (url.pathname === '/meetings/join') {
        const joinToken = url.searchParams.get('token');
        if (joinToken) {
          localStorage.setItem('pendingJoinToken', joinToken);
          localStorage.setItem('shouldAutoJoin', 'true');
        }
      }
    } catch (error) {
      console.error('Invalid redirect URL provided:', error);
    }
  }, [redirectUrl]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const pendingRedirect =
      redirectUrl ||
      localStorage.getItem('pendingRedirect') ||
      localStorage.getItem('redirectAfterLogin');

    const navigateToDestination = (target?: string | null) => {
      if (!target) {
        navigate('/dashboard', { replace: true });
        return;
      }

      try {
        const url = new URL(target, window.location.origin);

        // If we are heading back to join flow, ensure pending token is set for auto-join
        if (url.pathname === '/meetings/join') {
          const joinToken = url.searchParams.get('token');
          if (joinToken) {
            localStorage.setItem('pendingJoinToken', joinToken);
            localStorage.setItem('shouldAutoJoin', 'true');
          }
        }

        localStorage.removeItem('pendingRedirect');
        localStorage.removeItem('redirectAfterLogin');

        const pathWithQuery = url.pathname + url.search + url.hash;
        navigate(pathWithQuery || '/dashboard', { replace: true });
      } catch (error) {
        console.error('Invalid redirect URL:', error);
        navigate('/dashboard', { replace: true });
      }
    };

    navigateToDestination(pendingRedirect);
  }, [isAuthenticated, navigate, redirectUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-card">
              <Brain className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Academic Meeting Minutes Extractor
          </h1>
          <p className="text-sm text-muted-foreground">
            AI-Powered Meeting Documentation for Educational Institutions
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-elegant p-8 lg:p-10">
          {/* Auth Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Sign In to Continue
            </h2>
          </div>

          {/* Authentication Buttons */}
          <div className="space-y-4">
            {/* Google Auth Button */}
            <Button
              onClick={() => login('google')}
              variant="outline"
              size="lg"
              className="w-full h-12 relative group hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium">Continue with Google</span>
            </Button>

            {/* Microsoft Auth Button */}
            <Button
              onClick={() => login('microsoft')}
              variant="outline"
              size="lg"
              className="w-full h-12 relative group hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 23 23">
                <path fill="#f25022" d="M0 0h11v11H0z"/>
                <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                <path fill="#7fba00" d="M0 12h11v11H0z"/>
                <path fill="#ffb900" d="M12 12h11v11H12z"/>
              </svg>
              <span className="font-medium">Continue with Microsoft</span>
            </Button>
          </div>

        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
