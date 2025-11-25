import { Upload, Cog, Download, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload Audio",
    description: "Drag and drop meeting recordings in multiple formats.",
    features: ["MP3, WAV, M4A", "Batch uploads", "Secure storage"],
    time: "< 30 seconds"
  },
  {
    step: "02", 
    icon: Cog,
    title: "AI Processing",
    description: "Whisper transcribes, Mistral 7B extracts key information.",
    features: ["Speech-to-text", "Content analysis", "Structure generation"],
    time: "2-5 minutes"
  },
  {
    step: "03",
    icon: Download,
    title: "Minutes Ready",
    description: "Download professional minutes with task tracking.",
    features: ["PDF/DOCX formats", "Action items", "Instant sharing"],
    time: "Instant"
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-subtle-gradient">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            <Cog className="w-4 h-4" />
            Simple 3-Step Process
          </div>
          <h2 className="text-section-title mb-6">
            Audio to Minutes
            <span className="block text-primary">in 3 Simple Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Streamlined AI process transforms recordings into professional documentation automatically.
          </p>
        </div>

        {/* Process Steps */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={step.step} className="relative animate-fade-up" style={{ animationDelay: `${0.2 * index}s` }}>
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-12 h-0.5 bg-gradient-to-r from-primary/50 to-primary/20 z-0">
                    <ArrowRight className="absolute -right-2 -top-2 w-4 h-4 text-primary/50" />
                  </div>
                )}
                
                <div className="card-academic relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                  
                  {/* Content */}
                  <div className="pt-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    
                    <h3 className="text-feature-title mb-3">{step.title}</h3>
                    <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                      {step.description}
                    </p>
                    
                    {/* Features */}
                    <div className="space-y-2 mb-4">
                      {step.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                          {feature}
                        </div>
                      ))}
                    </div>
                    
                    {/* Time */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-xs font-medium w-fit">
                      <Clock className="w-3 h-3" />
                      {step.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Section - Image Removed */}
        <div className="animate-fade-up" style={{ animationDelay: '0.6s' }}>
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              Meeting Management Dashboard
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Track meetings, monitor tasks, and access your institutional archive.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;