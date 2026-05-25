import { useNavigate } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const CTASection = () => {
  const navigate = useNavigate();
  const ref = useInView<HTMLDivElement>(0.15);

  return (
    <section
      className="py-32 relative overflow-hidden"
      style={{ background: "var(--surface)" }}
      aria-labelledby="cta-heading"
    >
      {/* ── Accent border top ──────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(0,113,227,0.5), transparent)",
        }}
        aria-hidden="true"
      />

      {/* ── Subtle radial glow from center ─────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(0,113,227,0.1), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div ref={ref} className="reveal">

          {/* ── Headline ───────────────────────────────── */}
          <p className="label-caps mb-6">Get Started</p>
          <h2
            id="cta-heading"
            className="display-lg mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            Transform the way your
            <br />
            <span style={{ color: "#0071E3" }}>institution meets.</span>
          </h2>

          <p className="body-lg max-w-lg mx-auto mb-10">
            Join hundreds of academic teams already saving hours every week
            with AI-powered meeting minutes.
          </p>

          {/* ── CTAs ───────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate("/auth")}
              className="btn-accent text-base px-10 py-3.5 flex items-center gap-2"
            >
              Start for Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { window.location.href = "mailto:team.meetingminutes@gmail.com"; }}
              className="btn-ghost text-base px-10 py-3.5 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Contact Team
            </button>
          </div>

          {/* ── Credits ────────────────────────────────── */}
          <p
            className="body-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            A final-year engineering project by{" "}
            {[
              { name: "Om", url: "https://www.linkedin.com/in/om-ml-engg/" },
              { name: "Aniket", url: "https://www.linkedin.com/in/aniket-magdum-50187028a/" },
              { name: "Shreyash", url: "https://www.linkedin.com/in/shreyash-kurade-b46004373/" },
              { name: "Prasanna", url: "https://www.linkedin.com/in/prasanna-bhosale-429b82395/" },
            ].map((p, i, arr) => (
              <span key={p.name}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-150 underline underline-offset-2"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#0071E3")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  {p.name}
                </a>
                {i < arr.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;