import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Eye, EyeOff, Loader2, AlertCircle, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { toast } from "@/components/ui/use-toast";

type AuthTab = "signin" | "signup";

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const Divider = () => (
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t border-border" />
    </div>
    <div className="relative flex justify-center text-xs">
      <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">or</span>
    </div>
  </div>
);

const Auth = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login: loginAuth, loginWithCredentials, register, isAuthenticated, isLoading } = useAuth();
  const redirectUrl = searchParams.get('redirect');

  // ─── Tab state ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<AuthTab>("signin");

  // ─── Form state ───────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGoogleFallback, setShowGoogleFallback] = useState(false);
  const [showEmailNotVerified, setShowEmailNotVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // ─── Detect verification success state from /verify-email redirect ─────────
  useEffect(() => {
    const state = location.state as { verifiedSuccess?: boolean } | null;
    if (state?.verifiedSuccess) {
      setVerifiedSuccess(true);
      // Clear location state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // ─── Redirect helpers ─────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    try {
      const pendingRedirect = redirectUrl || localStorage.getItem('pendingRedirect');
      if (pendingRedirect) localStorage.setItem('redirectAfterLogin', pendingRedirect);
      await loginAuth('google');
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  useEffect(() => {
    if (!redirectUrl) return;
    localStorage.setItem('pendingRedirect', redirectUrl);
    try {
      const url = new URL(redirectUrl, window.location.origin);
      if (url.pathname === '/meetings/join') {
        const joinToken = url.searchParams.get('token');
        if (joinToken) {
          localStorage.setItem('pendingJoinToken', joinToken);
          localStorage.setItem('shouldAutoJoin', 'true');
        }
      }
    } catch (err) {
      console.error('Invalid redirect URL provided:', err);
    }
  }, [redirectUrl]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const pendingRedirect =
      redirectUrl ||
      localStorage.getItem('pendingRedirect') ||
      localStorage.getItem('redirectAfterLogin');

    const navigateToDestination = (target?: string | null) => {
      if (!target) { navigate('/dashboard', { replace: true }); return; }
      try {
        const url = new URL(target, window.location.origin);
        if (url.pathname === '/meetings/join') {
          const joinToken = url.searchParams.get('token');
          if (joinToken) {
            localStorage.setItem('pendingJoinToken', joinToken);
            localStorage.setItem('shouldAutoJoin', 'true');
          }
        }
        localStorage.removeItem('pendingRedirect');
        localStorage.removeItem('redirectAfterLogin');
        navigate(url.pathname + url.search + url.hash || '/dashboard', { replace: true });
      } catch {
        navigate('/dashboard', { replace: true });
      }
    };

    navigateToDestination(pendingRedirect);
  }, [isAuthenticated, navigate, redirectUrl]);

  // ─── Form submission ──────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowGoogleFallback(false);
    setShowEmailNotVerified(false);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithCredentials(email, password);
    } catch (err: any) {
      const status = err?.response?.status;
      const errorCode = err?.response?.data?.error;

      if (status === 403 && errorCode === 'EMAIL_NOT_VERIFIED') {
        setShowEmailNotVerified(true);
        setError(null); // Use the dedicated verification UI instead
      } else if (status === 401) {
        setError("Incorrect email or password.");
        setShowGoogleFallback(true);
      } else if (status === 429) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (status === 400) {
        setError("Invalid input. Please check your email and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    const passwordValidation = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@$!%*?&#]/.test(password),
    };
    const isPasswordValid = Object.values(passwordValidation).every(Boolean);

    if (!isPasswordValid) {
      setError("Please ensure your password meets all requirements.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name.trim(), email, password);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (status === 429) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (status === 400) {
        setError("Invalid input. Please check your details.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    try {
      await authService.resendVerification(email);
      toast({ title: "Verification email sent!", description: "Check your inbox for the new verification link." });
    } catch {
      toast({ title: "Failed to resend", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  const switchTab = (newTab: AuthTab) => {
    setTab(newTab);
    setError(null);
    setShowGoogleFallback(false);
    setShowEmailNotVerified(false);
    setPassword("");
  };

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo + app name */}
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

        {/* Email verified success banner */}
        {verifiedSuccess && (
          <div className="flex items-start gap-2.5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 mb-6">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
            <div>
              <p className="font-medium">Email verified successfully!</p>
              <p className="text-green-700">You can now sign in to your account.</p>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg shadow-elegant p-8 lg:p-10">

          {/* Tab switcher */}
          <div className="flex rounded-md border border-border overflow-hidden mb-8">
            <button
              id="auth-tab-signin"
              onClick={() => switchTab("signin")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === "signin"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              Sign In
            </button>
            <button
              id="auth-tab-signup"
              onClick={() => switchTab("signup")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === "signup"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Google OAuth button */}
          <Button
            id="auth-google-btn"
            onClick={handleGoogleLogin}
            variant="outline"
            size="lg"
            className="w-full h-12 relative group hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <GoogleIcon />
            <span className="font-medium">Continue with Google</span>
          </Button>

          <Divider />

          {/* ── Sign In form ─────────────────────────────────────────────────── */}
          {tab === "signin" && (
            <form id="signin-form" onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signin-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs text-primary font-medium hover:underline"
                    tabIndex={-1}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Email not verified banner — info style (amber/blue, not red) */}
              {showEmailNotVerified && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
                  <div className="flex items-start gap-2.5 mb-2">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">Email not verified</p>
                      <p className="text-amber-700 text-xs mt-0.5">
                        Please check your inbox for the verification link. The link expires in 24 hours.
                      </p>
                    </div>
                  </div>
                  <button
                    id="resend-verification-btn"
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="w-full mt-1 flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors disabled:opacity-50"
                  >
                    {isResending ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</> : "Resend verification email"}
                  </button>
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p>{error}</p>
                    {showGoogleFallback && (
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="mt-1 font-medium underline underline-offset-2 hover:no-underline"
                      >
                        Sign in with Google instead?
                      </button>
                    )}
                  </div>
                </div>
              )}

              <Button
                id="signin-submit-btn"
                type="submit"
                size="lg"
                className="w-full h-12 font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
                ) : (
                  "Sign In"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="text-primary font-medium hover:underline"
                >
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* ── Sign Up form ─────────────────────────────────────────────────── */}
          {tab === "signup" && (
            <form id="signup-form" onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name" className="text-sm font-medium">
                  Full name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-sm font-medium">
                  Password
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(min. 8 characters)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="text-xs space-y-1 mt-2">
                    <p className={password.length >= 8 ? "text-green-600" : "text-muted-foreground"}>
                      {password.length >= 8 ? "✓" : "○"} At least 8 characters
                    </p>
                    <p className={/[A-Z]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                      {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter
                    </p>
                    <p className={/[a-z]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                      {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter
                    </p>
                    <p className={/[0-9]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                      {/[0-9]/.test(password) ? "✓" : "○"} One number
                    </p>
                    <p className={/[@$!%*?&#]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                      {/[@$!%*?&#]/.test(password) ? "✓" : "○"} One special character (@$!%*?&#)
                    </p>
                  </div>
                )}
              </div>

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                id="signup-submit-btn"
                type="submit"
                size="lg"
                className="w-full h-12 font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</>
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signin")}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

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
