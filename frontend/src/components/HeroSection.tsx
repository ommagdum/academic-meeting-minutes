import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown } from "lucide-react";

const HeroSection = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "var(--bg)" }}
      aria-label="Hero"
    >
      {/* ── Dot-grid background ──────────────────────────── */}
      <div className="absolute inset-0 dot-grid" aria-hidden="true" />

      {/* ── Radial accent glow ───────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(0,113,227,0.22), transparent)",
        }}
        aria-hidden="true"
      />

      {/* ── Content ──────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-32 pb-24">

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill border mb-10 animate-fade-in"
          style={{
            background: "rgba(0,113,227,0.1)",
            borderColor: "rgba(0,113,227,0.25)",
            color: "#0071E3",
            fontFamily: "var(--font-body)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            animationDelay: "0ms",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#0071E3]"
            style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
          />
          AI-Powered Meeting Documentation
        </div>

        {/* ── Giant headline ───────────────────────────────── */}
        <h1
          className="animate-fade-up mb-6"
          style={{ animationDelay: "80ms" }}
        >
          <span
            className="display-xl block"
            style={{ color: "var(--text-primary)" }}
          >
            Meeting Minutes,
          </span>
          <span
            className="display-xl block"
            style={{ color: "#0071E3" }}
          >
            Automated.
          </span>
        </h1>

        {/* Sub-text */}
        <p
          className="body-lg max-w-2xl mx-auto mb-10 animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          Upload your recording. Our AI transcribes, extracts key points, action
          items, and decisions — then hands you polished minutes in seconds.
        </p>

        {/* ── CTAs ─────────────────────────────────────────── */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          {isAuthenticated ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-accent text-base px-8 py-3"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/auth")}
                className="btn-accent text-base px-8 py-3"
              >
                Start for Free
              </button>
              <button
                onClick={scrollToFeatures}
                className="btn-ghost text-base px-8 py-3"
              >
                See How It Works
              </button>
            </>
          )}
        </div>

        {/* ── Social proof ─────────────────────────────────── */}
        <div
          className="animate-fade-up"
          style={{ animationDelay: "320ms" }}
        >
          <p
            className="body-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Trusted by{" "}
            <span style={{ color: "var(--text-secondary)" }}>500+ institutions</span>
            {" "}— no credit card required
          </p>
        </div>
      </div>

      {/* ── Scroll indicator ─────────────────────────────── */}
      <button
        onClick={scrollToFeatures}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 group outline-none"
        aria-label="Scroll to features"
      >
        <span
          className="text-xs tracking-widest uppercase"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-body)" }}
        >
          Scroll
        </span>
        <ChevronDown
          className="w-4 h-4 animate-chevron-bounce"
          style={{ color: "var(--text-tertiary)" }}
        />
      </button>
    </section>
  );
};

export default HeroSection;