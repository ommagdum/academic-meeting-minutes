import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { toast } from "@/components/ui/use-toast";

type AuthTab = "signin" | "signup";

/* ── Shared asterisk mark ───────────────────────────────── */
const AsteriskMark = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <line x1="14" y1="2"     x2="14" y2="26"   stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="2"  y1="14"   x2="26" y2="14"   stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="4.93" y1="4.93" x2="23.07" y2="23.07" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="23.07" y1="4.93" x2="4.93" y2="23.07" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/* ── "or" divider ──────────────────────────────────────── */
const Divider = () => (
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full" style={{ borderTop: "1px solid var(--border-subtle)" }} />
    </div>
    <div className="relative flex justify-center text-xs">
      <span
        className="px-3 uppercase tracking-widest text-xs"
        style={{ background: "var(--surface)", color: "var(--text-tertiary)", fontFamily: "var(--font-body)" }}
      >
        or
      </span>
    </div>
  </div>
);

/* ── Password strength checklist ───────────────────────── */
const PasswordChecks = ({ password }: { password: string }) => {
  const checks = [
    { ok: password.length >= 8,        label: "At least 8 characters" },
    { ok: /[A-Z]/.test(password),      label: "One uppercase letter" },
    { ok: /[a-z]/.test(password),      label: "One lowercase letter" },
    { ok: /[0-9]/.test(password),      label: "One number" },
    { ok: /[@$!%*?&#]/.test(password), label: "One special character (@$!%*?&#)" },
  ];
  return (
    <div className="space-y-1 mt-2">
      {checks.map(({ ok, label }) => (
        <p
          key={label}
          className="text-xs flex items-center gap-1.5 transition-colors duration-150"
          style={{ color: ok ? "#34C759" : "var(--text-tertiary)" }}
        >
          <span>{ok ? "✓" : "○"}</span>
          {label}
        </p>
      ))}
    </div>
  );
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login: loginAuth, loginWithCredentials, register, isAuthenticated, isLoading } = useAuth();
  const redirectUrl = searchParams.get("redirect");

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
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // ─── Redirect helpers ─────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    try {
      const pendingRedirect = redirectUrl || localStorage.getItem("pendingRedirect");
      if (pendingRedirect) localStorage.setItem("redirectAfterLogin", pendingRedirect);
      await loginAuth("google");
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  useEffect(() => {
    if (!redirectUrl) return;
    localStorage.setItem("pendingRedirect", redirectUrl);
    try {
      const url = new URL(redirectUrl, window.location.origin);
      if (url.pathname === "/meetings/join") {
        const joinToken = url.searchParams.get("token");
        if (joinToken) {
          localStorage.setItem("pendingJoinToken", joinToken);
          localStorage.setItem("shouldAutoJoin", "true");
        }
      }
    } catch (err) {
      console.error("Invalid redirect URL provided:", err);
    }
  }, [redirectUrl]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const pendingRedirect =
      redirectUrl ||
      localStorage.getItem("pendingRedirect") ||
      localStorage.getItem("redirectAfterLogin");

    const navigateToDestination = (target?: string | null) => {
      if (!target) { navigate("/dashboard", { replace: true }); return; }
      try {
        const url = new URL(target, window.location.origin);
        if (url.pathname === "/meetings/join") {
          const joinToken = url.searchParams.get("token");
          if (joinToken) {
            localStorage.setItem("pendingJoinToken", joinToken);
            localStorage.setItem("shouldAutoJoin", "true");
          }
        }
        localStorage.removeItem("pendingRedirect");
        localStorage.removeItem("redirectAfterLogin");
        navigate(url.pathname + url.search + url.hash || "/dashboard", { replace: true });
      } catch {
        navigate("/dashboard", { replace: true });
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

    if (!email || !password) { setError("Please fill in all fields."); return; }

    setIsSubmitting(true);
    try {
      await loginWithCredentials(email, password);
    } catch (err: any) {
      const status = err?.response?.status;
      const errorCode = err?.response?.data?.error;

      if (status === 403 && errorCode === "EMAIL_NOT_VERIFIED") {
        setShowEmailNotVerified(true);
        setError(null);
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

    if (!name.trim() || !email || !password) { setError("Please fill in all fields."); return; }

    const passwordValidation = {
      length:    password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number:    /[0-9]/.test(password),
      special:   /[@$!%*?&#]/.test(password),
    };
    if (!Object.values(passwordValidation).every(Boolean)) {
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="text-center animate-fade-in">
          <div
            className="w-10 h-10 rounded-full border-2 border-transparent mx-auto mb-4 animate-spin"
            style={{ borderTopColor: "#0071E3" }}
          />
          <p className="body-sm">Checking authentication…</p>
        </div>
      </div>
    );
  }

  // ─── Shared label + input style helpers ──────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "0.375rem",
    display: "block",
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 relative"
      style={{ background: "var(--bg)" }}
    >
      {/* Dot grid + radial glow */}
      <div className="absolute inset-0 dot-grid" aria-hidden="true" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,113,227,0.15), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md animate-scale-in">

        {/* ── Logo ──────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 mb-4 outline-none"
            aria-label="MinutesAI home"
          >
            <AsteriskMark />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              MinutesAI
            </span>
          </button>
          <h1
            className="display-sm mb-1.5"
            style={{ color: "var(--text-primary)" }}
          >
            {tab === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="body-sm">
            {tab === "signin"
              ? "Sign in to your MinutesAI workspace"
              : "Start transforming your meetings today"}
          </p>
        </div>

        {/* ── Email verified success banner ─────────────────────── */}
        {verifiedSuccess && (
          <div
            className="flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm mb-5 animate-fade-in"
            style={{
              background: "rgba(52,199,89,0.1)",
              borderColor: "rgba(52,199,89,0.3)",
              color: "#34C759",
            }}
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>Email verified successfully!</p>
              <p style={{ color: "var(--text-secondary)" }}>You can now sign in to your account.</p>
            </div>
          </div>
        )}

        {/* ── Card ──────────────────────────────────────────────── */}
        <div className="card-surface p-8">

          {/* Pill tab switcher */}
          <div
            className="flex rounded-pill p-1 mb-7"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
          >
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                id={t === "signin" ? "auth-tab-signin" : "auth-tab-signup"}
                onClick={() => switchTab(t)}
                className="flex-1 py-2 text-sm font-medium rounded-pill transition-all duration-200"
                style={{
                  fontFamily: "var(--font-body)",
                  background: tab === t ? "#0071E3" : "transparent",
                  color: tab === t ? "#fff" : "var(--text-secondary)",
                }}
              >
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <button
            id="auth-google-btn"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              fontFamily: "var(--font-body)",
              background: "var(--surface-raised)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <Divider />

          {/* ── Sign In form ─────────────────────────────────────── */}
          {tab === "signin" && (
            <form id="signin-form" onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="signin-email" style={labelStyle}>Email address</label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="input-dark"
                />
              </div>

              <div>
                <label htmlFor="signin-password" style={labelStyle}>Password</label>
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
                    className="input-dark pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--text-tertiary)" }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs font-medium transition-colors"
                    style={{ color: "#0071E3" }}
                    tabIndex={-1}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Email not verified banner */}
              {showEmailNotVerified && (
                <div
                  className="rounded-lg border px-3 py-3 text-sm animate-fade-in"
                  style={{
                    background: "rgba(255,159,10,0.08)",
                    borderColor: "rgba(255,159,10,0.3)",
                  }}
                >
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF9F0A" }} />
                    <div>
                      <p className="font-medium" style={{ color: "var(--text-primary)" }}>Email not verified</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        Check your inbox for the verification link. Expires in 24 hours.
                      </p>
                    </div>
                  </div>
                  <button
                    id="resend-verification-btn"
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                    style={{
                      background: "rgba(255,159,10,0.12)",
                      color: "#FF9F0A",
                      border: "1px solid rgba(255,159,10,0.25)",
                    }}
                  >
                    {isResending ? <><Loader2 className="w-3 h-3 animate-spin" />Sending…</> : "Resend verification email"}
                  </button>
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm animate-fade-in"
                  style={{
                    background: "rgba(255,69,58,0.08)",
                    borderColor: "rgba(255,69,58,0.25)",
                    color: "#FF453A",
                  }}
                >
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

              <button
                id="signin-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="btn-accent w-full py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderRadius: "var(--radius-md)" }}
              >
                {isSubmitting
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Signing in…</span>
                  : "Sign In"
                }
              </button>

              <p className="text-center text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="font-medium"
                  style={{ color: "#0071E3" }}
                >
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* ── Sign Up form ─────────────────────────────────────── */}
          {tab === "signup" && (
            <form id="signup-form" onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="signup-name" style={labelStyle}>Full name</label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="input-dark"
                />
              </div>

              <div>
                <label htmlFor="signup-email" style={labelStyle}>Email address</label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="input-dark"
                />
              </div>

              <div>
                <label htmlFor="signup-password" style={labelStyle}>
                  Password
                  <span className="ml-1 font-normal" style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>
                    (min. 8 characters)
                  </span>
                </label>
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
                    className="input-dark pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--text-tertiary)" }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && <PasswordChecks password={password} />}
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm animate-fade-in"
                  style={{
                    background: "rgba(255,69,58,0.08)",
                    borderColor: "rgba(255,69,58,0.25)",
                    color: "#FF453A",
                  }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="btn-accent w-full py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderRadius: "var(--radius-md)" }}
              >
                {isSubmitting
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Creating account…</span>
                  : "Create Account"
                }
              </button>

              <p className="text-center text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signin")}
                  className="font-medium"
                  style={{ color: "#0071E3" }}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm transition-colors"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-body)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
