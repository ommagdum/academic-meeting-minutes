import { TrendingUp, Clock, Target, Shield, Users, Archive } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const stats = [
  {
    metric: "80%",
    label: "Less Time",
    desc: "From 3-hour manual effort to 15-minute review",
    icon: Clock,
  },
  {
    metric: "95%+",
    label: "Accuracy",
    desc: "Key point and action item extraction rate",
    icon: Target,
  },
  {
    metric: "5×",
    label: "Productivity",
    desc: "More strategic focus during your meetings",
    icon: TrendingUp,
  },
];

const benefits = [
  {
    icon: Users,
    title: "Role-Based Access",
    description:
      "Owner, participant, and viewer roles keep sensitive content in the right hands.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Encrypted at rest and in transit. Designed for institutional compliance.",
  },
  {
    icon: Archive,
    title: "Infinite Memory",
    description:
      "Searchable, indexed archive preserves every meeting's context forever.",
  },
];

const BenefitsSection = () => {
  const headingRef = useInView<HTMLDivElement>();
  const statsRef   = useInView<HTMLDivElement>(0.1);
  const cardsRef   = useInView<HTMLDivElement>(0.1);

  return (
    <section
      className="py-32"
      style={{ background: "var(--bg)" }}
      aria-labelledby="benefits-heading"
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Section header ─────────────────────────────── */}
        <div ref={headingRef} className="reveal text-center mb-20">
          <p className="label-caps mb-5">Benefits</p>
          <h2
            id="benefits-heading"
            className="display-md mx-auto max-w-2xl mb-5"
            style={{ color: "var(--text-primary)" }}
          >
            Measurable impact for{" "}
            <span style={{ color: "#0071E3" }}>academic teams</span>
          </h2>
          <p className="body-lg max-w-xl mx-auto">
            Quantified improvements in efficiency, accuracy, and institutional
            knowledge management.
          </p>
        </div>

        {/* ── Big stat numbers ───────────────────────────── */}
        <div
          ref={statsRef}
          className="reveal grid md:grid-cols-3 gap-5 mb-16"
        >
          {stats.map((stat, i) => {
            return (
              <div
                key={stat.metric}
                className="card-raised rounded-2xl p-8 text-center hover-lift hover-glow"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-6"
                  style={{
                    background: "rgba(0,113,227,0.12)",
                    border: "1px solid rgba(0,113,227,0.2)",
                  }}
                >
                  <stat.icon className="w-6 h-6" style={{ color: "#0071E3" }} />
                </div>
                <div
                  className="mb-1"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "#0071E3",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.metric}
                </div>
                <div
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  {stat.label}
                </div>
                <p className="body-sm">{stat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* ── Benefit cards row ──────────────────────────── */}
        <div
          ref={cardsRef}
          className="reveal grid md:grid-cols-3 gap-5"
        >
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="card-surface p-6 flex gap-5 hover-lift"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{
                  background: "rgba(0,113,227,0.1)",
                  border: "1px solid rgba(0,113,227,0.18)",
                }}
              >
                <b.icon className="w-5 h-5" style={{ color: "#0071E3" }} />
              </div>
              <div>
                <h3
                  className="font-semibold mb-1.5"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", fontSize: "1rem" }}
                >
                  {b.title}
                </h3>
                <p className="body-sm">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;