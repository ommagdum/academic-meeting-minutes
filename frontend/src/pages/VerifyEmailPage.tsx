import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/authService";
import { toast } from "@/components/ui/use-toast";

type VerifyState = "loading" | "success" | "expired" | "invalid";

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

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<VerifyState>("loading");
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }

    const verify = async () => {
      try {
        await authService.verifyEmail(token);
        setState("success");
        setTimeout(() => {
          navigate("/login", { state: { verifiedSuccess: true }, replace: true });
        }, 2000);
      } catch (err: any) {
        setState(err?.response?.status === 410 ? "expired" : "invalid");
      }
    };
    verify();
  }, [token, navigate]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || isResending) return;
    setIsResending(true);
    try {
      await authService.resendVerification(resendEmail.trim());
      setResendSent(true);
      toast({ title: "Verification email sent!", description: "Check your inbox for a new verification link." });
    } catch {
      toast({ title: "Failed to send", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <AuthShell>
        <div className="card-surface p-12 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(0,113,227,0.12)", border: "2px solid rgba(0,113,227,0.25)" }}
          >
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0071E3" }} />
          </div>
          <h2 className="display-sm mb-2" style={{ color: "var(--text-primary)" }}>Verifying your email…</h2>
          <p className="body-sm">Please wait a moment.</p>
        </div>
      </AuthShell>
    );
  }

  // ── States ──────────────────────────────────────────────────────────────────
  const stateConfig = {
    success: {
      icon: <CheckCircle2 className="w-9 h-9" style={{ color: "#34C759" }} />,
      iconBg: "rgba(52,199,89,0.12)",
      iconBorder: "rgba(52,199,89,0.25)",
      title: "Email verified!",
      desc: "Your email has been verified. You can now sign in to your account.",
    },
    expired: {
      icon: <Clock className="w-9 h-9" style={{ color: "#FF9F0A" }} />,
      iconBg: "rgba(255,159,10,0.12)",
      iconBorder: "rgba(255,159,10,0.25)",
      title: "Link expired",
      desc: "Verification links are valid for 24 hours. Request a new one below.",
    },
    invalid: {
      icon: <XCircle className="w-9 h-9" style={{ color: "#FF453A" }} />,
      iconBg: "rgba(255,69,58,0.12)",
      iconBorder: "rgba(255,69,58,0.25)",
      title: "Invalid link",
      desc: "This link is invalid or has already been used.",
    },
  }[state as "success" | "expired" | "invalid"];

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
          style={{ background: stateConfig.iconBg, border: `2px solid ${stateConfig.iconBorder}` }}
        >
          {stateConfig.icon}
        </div>

        <h1 className="display-sm mb-3" style={{ color: "var(--text-primary)" }}>{stateConfig.title}</h1>
        <p className="body-base mb-6">{stateConfig.desc}</p>

        {/* Success: redirect note + go to login button */}
        {state === "success" && (
          <>
            <p className="body-sm mb-5">Redirecting you to the login page…</p>
            <button
              id="verify-success-login-btn"
              onClick={() => navigate("/login", { state: { verifiedSuccess: true }, replace: true })}
              className="btn-accent w-full py-2.5 rounded-lg"
              style={{ borderRadius: "var(--radius-md)" }}
            >
              Go to Login
            </button>
          </>
        )}

        {/* Expired: resend form */}
        {state === "expired" && (
          !resendSent ? (
            <form onSubmit={handleResend} className="space-y-4 text-left mt-2">
              <div>
                <label
                  htmlFor="resend-email"
                  style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: "0.375rem" }}
                >
                  Your email address
                </label>
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="jane@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  disabled={isResending}
                  required
                  className="input-dark"
                />
              </div>
              <button
                id="verify-expired-resend-btn"
                type="submit"
                disabled={isResending || !resendEmail.trim()}
                className="btn-accent w-full py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderRadius: "var(--radius-md)" }}
              >
                {isResending
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sending…</span>
                  : "Send new verification link"
                }
              </button>
            </form>
          ) : (
            <div
              className="flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm mt-2 animate-fade-in"
              style={{ background: "rgba(52,199,89,0.08)", borderColor: "rgba(52,199,89,0.25)", color: "#34C759" }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p style={{ color: "var(--text-secondary)" }}>Verification email sent! Check your inbox.</p>
            </div>
          )
        )}

        {/* Invalid: link to login */}
        {state === "invalid" && (
          <button
            onClick={() => navigate("/login")}
            className="btn-accent w-full py-2.5 rounded-lg"
            style={{ borderRadius: "var(--radius-md)" }}
          >
            Go to Login
          </button>
        )}
      </div>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <button
          id="verify-back-to-login"
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

export default VerifyEmailPage;
