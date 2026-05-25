import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, CheckCircle2, XCircle, Clock, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";
import { toast } from "@/components/ui/use-toast";

type VerifyState = "loading" | "success" | "expired" | "invalid";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<VerifyState>("loading");
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    const verify = async () => {
      try {
        await authService.verifyEmail(token);
        setState("success");
        // Redirect to login after a short delay with a success state
        setTimeout(() => {
          navigate("/login", { state: { verifiedSuccess: true }, replace: true });
        }, 2000);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 410) {
          setState("expired");
        } else {
          setState("invalid");
        }
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
      toast({
        title: "Verification email sent!",
        description: "Check your inbox for a new verification link.",
      });
    } catch {
      toast({
        title: "Failed to send",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, hsl(224, 76%, 48%) 0%, hsl(224, 76%, 35%) 100%)" }}>
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Verifying your email…</h2>
          <p className="text-muted-foreground text-sm">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-card">
              <Brain className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Academic Meeting Minutes Extractor</p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-elegant p-8 lg:p-10 text-center">

          {/* ── Success ──────────────────────────────────────────────────────── */}
          {state === "success" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">Email verified!</h1>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Your email address has been verified successfully. You can now sign in to your account.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Redirecting you to the login page…
              </p>
              <Button
                id="verify-success-login-btn"
                onClick={() => navigate("/login", { state: { verifiedSuccess: true }, replace: true })}
                className="w-full"
                size="lg"
              >
                Go to Login
              </Button>
            </>
          )}

          {/* ── Expired ──────────────────────────────────────────────────────── */}
          {state === "expired" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-amber-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">Link expired</h1>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Your verification link has expired. Verification links are only valid for{" "}
                <span className="font-medium text-foreground">24 hours</span>. Request a new one below.
              </p>

              {!resendSent ? (
                <form onSubmit={handleResend} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <Label htmlFor="resend-email" className="text-sm font-medium">
                      Your email address
                    </Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="jane@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      disabled={isResending}
                      required
                    />
                  </div>
                  <Button
                    id="verify-expired-resend-btn"
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isResending || !resendEmail.trim()}
                  >
                    {isResending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                    ) : (
                      "Send new verification link"
                    )}
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-2.5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                  <p>Verification email sent! Check your inbox.</p>
                </div>
              )}
            </>
          )}

          {/* ── Invalid ──────────────────────────────────────────────────────── */}
          {state === "invalid" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">Invalid link</h1>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                This verification link is invalid or has already been used. If you believe this is a mistake, please{" "}
                <button
                  className="text-primary hover:underline font-medium"
                  onClick={() => navigate("/login")}
                >
                  go back to login
                </button>{" "}
                and request a new verification email.
              </p>
            </>
          )}

        </div>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <button
            id="verify-back-to-login"
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </div>

      </div>
    </div>
  );
};

export default VerifyEmailPage;
