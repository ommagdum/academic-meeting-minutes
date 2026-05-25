import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";

/* ── Shared page shell ──────────────────────────────────── */
const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div
    className="min-h-screen flex items-center justify-center px-4 py-16 relative"
    style={{ background: "var(--bg)" }}
  >
    <div className="absolute inset-0 dot-grid" aria-hidden="true" />
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,113,227,0.12), transparent)",
      }}
      aria-hidden="true"
    />
    <div className="relative z-10 w-full max-w-md animate-scale-in">
      {children}
    </div>
  </div>
);

/* ── Logo mark ──────────────────────────────────────────── */
const AsteriskMark = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <line x1="14" y1="2" x2="14" y2="26" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="2" y1="14" x2="26" y2="14" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="4.93" y1="4.93" x2="23.07" y2="23.07" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="23.07" y1="4.93" x2="4.93" y2="23.07" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOAuthAccount, setIsOAuthAccount] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsOAuthAccount(false);
    if (!email) { setError("Please enter your email address."); return; }

    setIsSubmitting(true);
    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      const errorCode = err?.response?.data?.error;
      const message = err?.response?.data?.message || "Something went wrong. Please try again.";
      if (errorCode === "OAUTH_ACCOUNT") {
        setIsOAuthAccount(true);
        setError(message);
      } else if (err?.response?.status === 429) {
        setError("Too many requests. Please wait a few minutes and try again.");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try { await login("google"); } catch (err) { console.error("Login error:", err); }
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "0.375rem",
    display: "block",
  };

  return (
    <AuthShell>
      {/* Logo */}
      <div className="text-center mb-8">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 outline-none mb-4" aria-label="MinutesAI home">
          <AsteriskMark />
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)" }}>
            MinutesAI
          </span>
        </button>
      </div>

      <div className="card-surface p-8">
        {success ? (
          /* ── Success state ────────────────────────────────── */
          <div className="text-center animate-scale-in">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(52,199,89,0.12)", border: "2px solid rgba(52,199,89,0.25)" }}
            >
              <CheckCircle2 className="w-9 h-9" style={{ color: "#34C759" }} />
            </div>
            <h2 className="display-sm mb-3" style={{ color: "var(--text-primary)" }}>Check your email</h2>
            <p className="body-base mb-6">
              If an account exists for{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{email}</span>
              , we've sent a password reset link.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn-accent w-full py-2.5 rounded-lg"
              style={{ borderRadius: "var(--radius-md)" }}
            >
              Return to sign in
            </button>
          </div>
        ) : (
          /* ── Form ─────────────────────────────────────────── */
          <>
            {/* Icon + heading */}
            <div className="text-center mb-7">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(0,113,227,0.12)", border: "2px solid rgba(0,113,227,0.2)" }}
              >
                <KeyRound className="w-7 h-7" style={{ color: "#0071E3" }} />
              </div>
              <h1 className="display-sm mb-2" style={{ color: "var(--text-primary)" }}>Reset Password</h1>
              <p className="body-sm">Enter your email and we'll send you a reset link.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" style={labelStyle}>Email address</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="input-dark"
                />
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm animate-fade-in"
                  style={{ background: "rgba(255,69,58,0.08)", borderColor: "rgba(255,69,58,0.25)", color: "#FF453A" }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p>{error}</p>
                    {isOAuthAccount && (
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="mt-1 font-medium underline underline-offset-2 hover:no-underline"
                      >
                        Sign in with Google
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-accent w-full py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderRadius: "var(--radius-md)" }}
              >
                {isSubmitting
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sending link…</span>
                  : "Send reset link"
                }
              </button>
            </form>
          </>
        )}
      </div>

      {/* Back to sign in */}
      <div className="mt-6 text-center">
        <button
          onClick={() => navigate("/login")}
          className="text-sm transition-colors"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-body)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
        >
          ← Back to sign in
        </button>
      </div>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
