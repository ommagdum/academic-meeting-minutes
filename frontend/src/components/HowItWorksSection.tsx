import { Upload, Cog, Download } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const steps = [
  {
    num: "01",
    icon: Upload,
    title: "Upload Your Audio",
    description:
      "Drag and drop meeting recordings in any common format. Batch upload supported — process multiple sessions at once.",
    tags: ["MP3, WAV, M4A", "Batch uploads", "Secure cloud storage"],
    time: "< 30 sec",
  },
  {
    num: "02",
    icon: Cog,
    title: "AI Does the Work",
    description:
      "Whisper transcribes with high accuracy. Mistral 7B then extracts decisions, action items, and agenda outcomes.",
    tags: ["Speech-to-text", "Content analysis", "Structure generation"],
    time: "2 – 5 min",
  },
  {
    num: "03",
    icon: Download,
    title: "Minutes Ready",
    description:
      "Download polished, formatted minutes in PDF or DOCX. Action items auto-tracked. Share in one click.",
    tags: ["PDF & DOCX", "Action items", "Instant sharing"],
    time: "Instant",
  },
];

const HowItWorksSection = () => {
  const headingRef = useInView<HTMLDivElement>();

  return (
    <section
      className="py-32"
      style={{ background: "var(--surface)" }}
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Section header ─────────────────────────────── */}
        <div ref={headingRef} className="reveal text-center mb-24">
          <p className="label-caps mb-5">How It Works</p>
          <h2
            id="how-it-works-heading"
            className="display-md mx-auto max-w-2xl"
            style={{ color: "var(--text-primary)" }}
          >
            Audio to minutes{" "}
            <span style={{ color: "#0071E3" }}>in three steps</span>
          </h2>
        </div>

        {/* ── Steps ──────────────────────────────────────── */}
        <div className="flex flex-col gap-0">
          {steps.map((step, index) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const ref = useInView<HTMLDivElement>();
            const isRight = index % 2 === 1;

            return (
              <div
                key={step.num}
                ref={ref}
                className={`reveal grid lg:grid-cols-2 gap-16 items-center py-16 border-b ${
                  index === steps.length - 1 ? "border-transparent" : ""
                }`}
                style={{
                  borderColor: "var(--border-subtle)",
                  animationDelay: `${index * 120}ms`,
                }}
              >
                {/* ── Editorial number (alternates sides on desktop) ─ */}
                <div className={`flex items-center gap-10 ${isRight ? "lg:order-2" : ""}`}>
                  {/* Giant step number */}
                  <span
                    className="hidden sm:block select-none flex-shrink-0"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(5rem, 12vw, 9rem)",
                      fontWeight: 700,
                      lineHeight: 1,
                      color: "rgba(0,113,227,0.18)",
                      letterSpacing: "-0.04em",
                    }}
                    aria-hidden="true"
                  >
                    {step.num}
                  </span>

                  {/* Content */}
                  <div className="flex-1">
                    {/* Mobile: show step number inline */}
                    <span
                      className="inline-block sm:hidden text-4xl font-bold mr-3 select-none"
                      style={{ fontFamily: "var(--font-display)", color: "rgba(0,113,227,0.35)" }}
                      aria-hidden="true"
                    >
                      {step.num}
                    </span>

                    <h3
                      className="display-sm mb-4"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="body-base mb-6 max-w-sm">{step.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {step.tags.map((tag) => (
                        <span
                          key={tag}
                          className="badge badge-draft text-xs"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Icon card ──────────────────────────────────── */}
                <div className={`flex justify-center ${isRight ? "lg:order-1" : ""}`}>
                  <div
                    className="w-56 h-56 rounded-2xl flex flex-col items-center justify-center gap-5 glass hover-lift"
                    style={{
                      border: "1px solid var(--border-subtle)",
                      background: "var(--surface-raised)",
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{
                        background: "rgba(0,113,227,0.12)",
                        border: "1px solid rgba(0,113,227,0.2)",
                      }}
                    >
                      <step.icon className="w-8 h-8" style={{ color: "#0071E3" }} />
                    </div>
                    <span
                      className="text-sm font-medium px-4 py-1 rounded-pill"
                      style={{
                        fontFamily: "var(--font-body)",
                        background: "rgba(0,113,227,0.1)",
                        color: "#0071E3",
                        border: "1px solid rgba(0,113,227,0.2)",
                      }}
                    >
                      {step.time}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;