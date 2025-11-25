import { TrendingUp, Clock, Target, Shield, Users, Archive } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    metric: "80%",
    title: "Time Saved",
    description: "Reduce documentation time from hours to minutes.",
    comparison: "From 3 hours to 15 minutes"
  },
  {
    icon: Target,
    metric: "100%",
    title: "Accuracy",
    description: "Eliminate errors with consistent AI formatting.",
    comparison: "Zero missed action items"
  },
  {
    icon: TrendingUp,
    metric: "5x",
    title: "Productivity",
    description: "Focus on discussions, not documentation.",
    comparison: "More strategic meeting time"
  },
  {
    icon: Users,
    metric: "24/7",
    title: "Access",
    description: "Searchable archives accessible to all members.",
    comparison: "End document hunting"
  },
  {
    icon: Shield,
    metric: "Secure",
    title: "Protection",
    description: "Enterprise-grade security for sensitive data.",
    comparison: "Bank-level encryption"
  },
  {
    icon: Archive,
    metric: "∞",
    title: "Memory",
    description: "Searchable knowledge base preserves context.",
    comparison: "Never lose meeting history"
  }
];

const BenefitsSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary-foreground rounded-full text-sm font-medium mb-4">
            <TrendingUp className="w-4 h-4" />
            Quantified Impact
          </div>
          <h2 className="text-section-title mb-6">
            Measurable Impact for
            <span className="block text-primary">Academic Teams</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Quantified improvements in efficiency, accuracy, and institutional knowledge management.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <div 
              key={benefit.title}
              className="card-academic group text-center animate-fade-up"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              {/* Icon */}
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <benefit.icon className="w-8 h-8 text-primary" />
              </div>
              
              {/* Metric */}
              <div className="text-4xl font-bold text-primary mb-2">{benefit.metric}</div>
              
              {/* Title */}
              <h3 className="text-feature-title mb-4">{benefit.title}</h3>
              
              {/* Description */}
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {benefit.description}
              </p>
              
              {/* Comparison */}
              <div className="px-4 py-2 bg-secondary/10 text-secondary-foreground rounded-lg text-xs font-medium">
                {benefit.comparison}
              </div>
            </div>
          ))}
        </div>

        {/* Impact Summary */}
        <div className="max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: '0.6s' }}>
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 border border-primary/10">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                Built for Academic Excellence
              </h3>
              <p className="text-muted-foreground">
                Designed specifically for academic institutions and research teams.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Processing Time</div>
                <div className="text-3xl font-bold text-primary">2-5 min</div>
                <div className="text-xs text-muted-foreground">Average duration</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                <div className="text-3xl font-bold text-secondary">95%+</div>
                <div className="text-xs text-muted-foreground">Key point extraction</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Supported Formats</div>
                <div className="text-3xl font-bold text-foreground">10+</div>
                <div className="text-xs text-muted-foreground">Audio & output formats</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;