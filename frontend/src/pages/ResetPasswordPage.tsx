import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, EyeOff, Eye, ShieldCheck } from "lucide-react";
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

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("Invalid password reset link.");
  }, [token]);

  const passwordValidation = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[@$!%*?&#]/.test(password),
  };
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) { setError("Invalid password reset link."); return; }
    if (!isPasswordValid) { setError("Please ensure your password meets all requirements."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, password);
      toast({ title: "Password reset successful", description: "You can now log in with your new password." });
      navigate("/login");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reset password. The link might be invalid or expired.");
    } finally {
      setIsSubmitting(false);
    }
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
        {/* Icon + heading */}
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(0,113,227,0.12)", border: "2px solid rgba(0,113,227,0.2)" }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: "#0071E3" }} />
          </div>
          <h1 className="display-sm mb-2" style={{ color: "var(--text-primary)" }}>Create New Password</h1>
          <p className="body-sm">Please enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label htmlFor="password" style={labelStyle}>New Password</label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || !token}
                required
                className="input-dark pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && <PasswordChecks password={password} />}
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirmPassword" style={labelStyle}>Confirm New Password</label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting || !token}
                required
                className="input-dark pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm animate-fade-in"
              style={{ background: "rgba(255,69,58,0.08)", borderColor: "rgba(255,69,58,0.25)", color: "#FF453A" }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="btn-accent w-full py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ borderRadius: "var(--radius-md)" }}
          >
            {isSubmitting
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Resetting password…</span>
              : "Reset Password"
            }
          </button>
        </form>
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

export default ResetPasswordPage;
