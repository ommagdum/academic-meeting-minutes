// src/pages/JoinMeeting.tsx
import { useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { AlertCircle, Calendar, CheckCircle, Loader2, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useJoinMeeting } from '@/hooks/useJoinMeeting';

const JoinMeeting = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  
  const { isAuthenticated, login } = useAuth();
  const { meeting, loading, error, handleJoin, joining, validation } = useJoinMeeting(token);
  const hasTriggeredAutoJoin = useRef(false);

  // If meeting requires auth and user isn't logged in, redirect to login immediately
  useEffect(() => {
    if (!token) return;
    if (loading) return;

    const requiresAuth = validation?.requiresAuth || meeting?.requiresAuthentication;

    if (requiresAuth && !isAuthenticated) {
      localStorage.setItem('pendingJoinToken', token);
      localStorage.setItem('shouldAutoJoin', 'true');

      const joinUrl = `${window.location.pathname}${window.location.search}`;
      localStorage.setItem('redirectAfterLogin', joinUrl);
      localStorage.setItem('pendingRedirect', joinUrl);

      navigate(`/login?redirect=${encodeURIComponent(joinUrl)}`, {
        replace: true,
        state: { fromJoinRedirect: true },
      });
    }
  }, [
    token,
    loading,
    validation,
    meeting,
    isAuthenticated,
    navigate,
  ]);

  // Once authenticated and validation is ready, auto-complete the join flow if requested
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!token) return;
    if (loading) return;
    if (joining) return;
    if (!validation?.valid) return;

    const pendingToken = localStorage.getItem('pendingJoinToken');
    const shouldAutoJoin = localStorage.getItem('shouldAutoJoin') === 'true';

    if (pendingToken === token && shouldAutoJoin && !hasTriggeredAutoJoin.current) {
      hasTriggeredAutoJoin.current = true;
      localStorage.removeItem('pendingJoinToken');
      localStorage.removeItem('shouldAutoJoin');
      handleJoin();
    }
  }, [isAuthenticated, token, loading, validation, joining, handleJoin]);

  const formattedDate = useMemo(() => {
    if (!meeting?.scheduledTime) return 'Not scheduled';
    try {
      return format(new Date(meeting.scheduledTime), 'PPP p');
    } catch (err) {
      console.error('[JoinMeeting] Date formatting failed:', err);
      return meeting.scheduledTime;
    }
  }, [meeting]);

  const renderLoadingState = () => (
    <Card className="card-academic animate-fade-up text-center">
      <CardHeader className="space-y-4">
        <CardTitle className="text-xl font-semibold text-foreground">Validating invitation...</CardTitle>
        <CardDescription className="text-muted-foreground">
          We're confirming the meeting details. This only takes a moment.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" aria-hidden />
        <p className="text-sm text-muted-foreground">Hold tight while we check your invitation.</p>
      </CardContent>
    </Card>
  );

  const renderErrorState = () => (
    <Card className="card-academic animate-fade-up">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-6 w-6" aria-hidden />
          <CardTitle className="text-xl font-semibold">We couldn't verify this invite</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          {validation?.message || 'Something went wrong while checking your invitation token.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive" className="border-destructive/30">
          <AlertTitle className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5" aria-hidden />
            {validation?.message || 'Invitation issue'}
          </AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            {error || 'Please make sure you opened the most recent link from the organizer.'}
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Double-check that you copied the full URL from your email. If this keeps happening, ask the organizer to send a new
          invitation.
        </p>
        <div className="pt-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSuccessState = () => {
    const requiresAuth = validation?.requiresAuth || meeting?.requiresAuthentication;
    const canJoin = !requiresAuth || (requiresAuth && isAuthenticated);

    return (
      <Card className="card-academic animate-fade-up space-y-6">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3 text-primary">
            <CheckCircle className="h-6 w-6" aria-hidden />
            <div>
              <CardTitle className="text-2xl font-semibold text-feature-title">You're invited!</CardTitle>
              <CardDescription className="text-muted-foreground">
                Review the meeting details and confirm that you'd like to join.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Meeting</p>
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
              <p className="text-foreground font-semibold text-lg">{meeting?.title}</p>
              {meeting?.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{meeting.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">Organizer</p>
                <p className="text-muted-foreground">{meeting?.organizerName}</p>
                {meeting?.organizerEmail && (
                  <p className="text-xs text-muted-foreground/70">{meeting.organizerEmail}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">Scheduled time</p>
                <p className="text-muted-foreground">{formattedDate}</p>
                {meeting?.timezone && (
                  <p className="text-xs text-muted-foreground/70">{meeting.timezone}</p>
                )}
              </div>
            </div>
          </div>

          {requiresAuth && !isAuthenticated && (
            <Alert variant="warning" className="bg-amber-50 border-amber-200">
              <AlertTitle className="flex items-center gap-2 text-amber-800">
                <LogIn className="h-4 w-4" />
                Authentication Required
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                You need to be logged in to join this meeting.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Button
              className="w-full btn-primary flex items-center justify-center gap-2"
              onClick={handleJoin}
              disabled={joining || !canJoin}
            >
              {joining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Joining meeting...
                </>
              ) : requiresAuth && !isAuthenticated ? (
                'Please log in to join'
              ) : (
                'Join meeting'
              )}
            </Button>

            {requiresAuth && !isAuthenticated && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    // Store the current token as pending before starting auth
                    if (token) {
                      localStorage.setItem('pendingJoinToken', token);
                    }
                    
                    // Store the current URL to return to after auth
                    const joinUrl = window.location.pathname + window.location.search;
                    localStorage.setItem('redirectAfterLogin', joinUrl);
                    localStorage.setItem('pendingRedirect', joinUrl);
                    localStorage.setItem('shouldAutoJoin', 'true');
                    
                    // Initiate Google Sign-In
                    try {
                      await login('google');
                    } catch (error) {
                      console.error('Google Sign-In error:', error);
                      // The error will be handled by the auth service
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google to join
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  You need to be signed in to join this meeting. Your Google account will be used for authentication.
                </p>
              </div>
            )}

            {!requiresAuth && !isAuthenticated && (
              <p className="text-xs text-muted-foreground text-center">
                You can join this meeting without an account. Your name will be visible to other participants.
              </p>
            )}

            <p className="text-xs text-muted-foreground text-center">
              By joining, you agree to share your attendance with the organizer. You can leave the meeting at any time from your
              dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-subtle-gradient flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {loading && renderLoadingState()}
        {!loading && (!validation?.valid || error) && renderErrorState()}
        {!loading && validation?.valid && !error && renderSuccessState()}
      </div>
    </div>
  );
};

export default JoinMeeting;