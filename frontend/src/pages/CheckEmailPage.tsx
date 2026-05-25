import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Mail, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { authService } from "@/services/authService";
import { toast } from "@/components/ui/use-toast";

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
        background:
          "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,113,227,0.12), transparent)",
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

const CheckEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isResending, setIsResending] = useState(false);

  const email =
    (location.state as { email?: string } | null)?.email ||
    searchParams.get("email") ||
    "";

  const handleResend = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    try {
      await authService.resendVerification(email);
      toast({
        title: "Verification email sent!",
        description: "A new verification link has been sent to your inbox.",
      });
    } catch {
      toast({
        title: "Failed to resend",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
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

      <div className="card-surface p-8 text-center">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: "rgba(0,113,227,0.12)",
            border: "2px solid rgba(0,113,227,0.25)",
          }}
        >
          <Mail className="w-9 h-9" style={{ color: "#0071E3" }} />
        </div>

        <h1 className="display-sm mb-3" style={{ color: "var(--text-primary)" }}>
          Check your email
        </h1>

        <p className="body-base mb-1.5">
          We've sent a verification link to{" "}
          {email ? (
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{email}</span>
          ) : (
            "your email address"
          )}
          . Click the link to verify your account.
        </p>

        <p className="body-sm mb-7">
          The link expires in{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>24 hours</span>.
        </p>

        {/* Steps */}
        <div
          className="rounded-lg p-4 text-left mb-7 space-y-3"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="label-caps mb-2">What to do next</p>
          {[
            "Open your email inbox",
            <>Find the email from <strong style={{ color: "var(--text-primary)" }}>MinutesAI</strong></>,
            <>Click <strong style={{ color: "var(--text-primary)" }}>"Verify Email Address"</strong></>,
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,113,227,0.15)", color: "#0071E3" }}
              >
                {i + 1}
              </span>
              <span className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Resend */}
        {email && (
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
            <p className="body-sm mb-3">Didn't receive it? Check spam or resend:</p>
            <button
              id="check-email-resend-btn"
              onClick={handleResend}
              disabled={isResending}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50"
              style={{
                fontFamily: "var(--font-body)",
                background: "var(--surface-raised)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {isResending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                : <><RefreshCw className="w-4 h-4" />Resend verification email</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <button
          id="check-email-back-to-login"
          onClick={() => navigate("/login")}
          className="inline-flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-body)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
      </div>
    </AuthShell>
  );
};

export default CheckEmailPage;
