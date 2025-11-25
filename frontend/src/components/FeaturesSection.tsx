import { Mic, Brain, FileText, Users, Calendar, CheckCircle, Zap, Lock } from "lucide-react";
import aiProcessing from "@/assets/ai-processing.jpg";

const features = [
  {
    icon: Mic,
    title: "Audio Processing",
    description: "Multi-format audio upload with advanced speech-to-text conversion.",
    highlight: "Multi-format support"
  },
  {
    icon: Brain,
    title: "AI Extraction",
    description: "Automatically identifies key points, decisions, and action items.",
    highlight: "Mistral 7B powered"
  },
  {
    icon: FileText,
    title: "Document Generation", 
    description: "Professional minutes in PDF/DOCX with consistent formatting.",
    highlight: "Multiple formats"
  },
  {
    icon: CheckCircle,
    title: "Task Tracking",
    description: "Automatic action item detection and progress monitoring.",
    highlight: "Progress tracking"
  },
  {
    icon: Calendar,
    title: "Meeting Series",
    description: "Organize related meetings and maintain continuity.",
    highlight: "Organized archive"
  },
  {
    icon: Users,
    title: "Role Management",
    description: "Secure access with owner, participant, and viewer roles.",
    highlight: "Secure sharing"
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description: "Live processing status and completion notifications.",
    highlight: "Live updates"
  },
  {
    icon: Lock,
    title: "Secure Storage",
    description: "Encrypted storage with controlled access to meeting data.",
    highlight: "Enterprise grade"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary-foreground rounded-full text-sm font-medium mb-4">
            <Brain className="w-4 h-4" />
            Powered by Advanced AI
          </div>
          <h2 className="text-section-title mb-6">
            AI-Powered Meeting
            <span className="block text-primary">Documentation</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Advanced AI technology handles every step from audio processing to structured minute generation.
          </p>
        </div>

        {/* AI Processing Visual
        <div className="mb-20 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="relative max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-elegant">
              <img 
                src={aiProcessing} 
                alt="AI processing workflow transforming audio to structured documents"
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 rounded-2xl" />
          </div>
        </div> */}

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="card-academic group animate-fade-up"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              <div className="mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="inline-block px-2 py-1 bg-secondary/20 text-secondary-foreground text-xs font-medium rounded-full mb-3">
                  {feature.highlight}
                </div>
              </div>
              
              <h3 className="text-feature-title mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;