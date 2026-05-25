import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Brain, Mail, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { toast } from "@/components/ui/use-toast";

const CheckEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isResending, setIsResending] = useState(false);

  // Email passed via router state (from register) or query param (fallback)
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-card">
              <Brain className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Academic Meeting Minutes Extractor
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-lg shadow-elegant p-8 lg:p-10 text-center">

          {/* Envelope illustration */}
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center animate-glow"
              style={{ background: "linear-gradient(135deg, hsl(224, 76%, 48%) 0%, hsl(224, 76%, 35%) 100%)" }}
            >
              <Mail className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3">
            Check your email
          </h1>

          <p className="text-muted-foreground mb-2 leading-relaxed">
            We've sent a verification link to{" "}
            {email ? (
              <span className="font-semibold text-foreground">{email}</span>
            ) : (
              "your email address"
            )}
            . Click the link in the email to verify your account.
          </p>

          <p className="text-sm text-muted-foreground mb-8">
            The link will expire in{" "}
            <span className="font-medium text-foreground">24 hours</span>.
          </p>

          {/* Steps hint */}
          <div className="bg-muted rounded-lg p-4 text-left mb-8 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              What to do next
            </p>
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span>Open your email inbox</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span>Find the email from <strong>Academic Meeting Minutes</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span>Click <strong>"Verify Email Address"</strong></span>
            </div>
          </div>

          {/* Resend */}
          {email && (
            <div className="border-t border-border pt-6">
              <p className="text-sm text-muted-foreground mb-3">
                Didn't receive the email? Check your spam folder or{" "}
              </p>
              <Button
                id="check-email-resend-btn"
                variant="outline"
                onClick={handleResend}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Resend verification email</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <button
            id="check-email-back-to-login"
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

export default CheckEmailPage;
