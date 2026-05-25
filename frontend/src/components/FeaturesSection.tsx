import { Mic, Brain, FileText, Users, Calendar, CheckCircle, Zap, Lock } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const features = [
  {
    icon: Mic,
    title: "Audio Processing",
    description: "Multi-format audio upload with advanced speech-to-text conversion. MP3, WAV, M4A and more.",
    highlight: "Multi-format",
  },
  {
    icon: Brain,
    title: "AI Extraction",
    description: "Automatically identifies key points, decisions, and action items with Mistral 7B.",
    highlight: "Mistral 7B",
  },
  {
    icon: FileText,
    title: "Document Generation",
    description: "Professional minutes in PDF/DOCX with consistent, institution-ready formatting.",
    highlight: "PDF & DOCX",
  },
  {
    icon: CheckCircle,
    title: "Task Tracking",
    description: "Automatic action item detection, assignee tagging, and progress monitoring.",
    highlight: "Auto-detect",
  },
  {
    icon: Calendar,
    title: "Meeting Series",
    description: "Organize related meetings, maintain context continuity across sessions.",
    highlight: "Organized",
  },
  {
    icon: Users,
    title: "Role Management",
    description: "Secure access with owner, participant, and viewer roles built-in.",
    highlight: "Secure sharing",
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description: "Live processing status via WebSocket and instant completion notifications.",
    highlight: "Live updates",
  },
  {
    icon: Lock,
    title: "Secure Storage",
    description: "Encrypted storage with granular access control for sensitive meeting data.",
    highlight: "Enterprise",
  },
];

const FeaturesSection = () => {
  const headingRef = useInView<HTMLDivElement>();

  return (
    <section
      className="py-32"
      style={{ background: "var(--bg)" }}
      aria-labelledby="features-heading"
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Section header ─────────────────────────────── */}
        <div ref={headingRef} className="reveal text-center mb-20">
          <p className="label-caps mb-5">Features</p>
          <h2
            id="features-heading"
            className="display-md mx-auto max-w-2xl mb-5"
            style={{ color: "var(--text-primary)" }}
          >
            Everything you need,{" "}
            <span style={{ color: "#0071E3" }}>nothing you don't</span>
          </h2>
          <p className="body-lg max-w-xl mx-auto">
            Advanced AI technology handles every step — from raw audio to
            structured, searchable meeting records.
          </p>
        </div>

        {/* ── Feature grid ───────────────────────────────── */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
          {features.map((feature, index) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const cardRef = useInView<HTMLDivElement>();
            return (
              <div
                key={feature.title}
                ref={cardRef}
                className="reveal card-surface group p-6 hover-lift hover-glow cursor-default"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Icon container */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 transition-colors duration-200"
                  style={{
                    background: "rgba(0,113,227,0.12)",
                    border: "1px solid rgba(0,113,227,0.2)",
                  }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: "#0071E3" }} />
                </div>

                {/* Highlight chip */}
                <span className="badge badge-accent mb-3">{feature.highlight}</span>

                <h3
                  className="text-base font-semibold mb-2"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  {feature.title}
                </h3>
                <p className="body-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;