import { Button } from "@/components/ui/button";
import { Play, ArrowRight, Mic, Brain, FileText } from "lucide-react";
import heroMeeting from "@/assets/hero-meeting.jpg";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen flex items-center bg-subtle-gradient overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-48 h-48 bg-secondary/10 rounded-full blur-2xl" />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-up">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <Brain className="w-4 h-4" />
                AI-Powered Meeting Documentation
              </div>
              
              <h1 className="text-hero leading-tight">
                Academic Meeting
                <span className="block text-primary">Minutes Extractor</span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                AI-powered solution that transforms meeting audio into structured, professional minutes.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">80%</div>
                <div className="text-sm text-muted-foreground">Time Saved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">AI</div>
                <div className="text-sm text-muted-foreground">Powered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Accurate</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {isAuthenticated ? (
                <Button size="lg" className="btn-primary" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button size="lg" className="btn-primary group" onClick={() => navigate('/auth')}>
                    <Play className="w-5 h-5 mr-2" />
                    View Demo
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="btn-secondary"
                    onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Learn More
                  </Button>
                </>
              )}
            </div>

            {/* Process Preview */}
            <div className="flex items-center gap-4 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
                <span>Upload Audio</span>
              </div>
              <ArrowRight className="w-4 h-4" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <span>AI Processing</span>
              </div>
              <ArrowRight className="w-4 h-4" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <span>Perfect Minutes</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-2xl overflow-hidden animate-glow">
              <img 
                src={heroMeeting} 
                alt="Academic meeting with professionals discussing around a conference table"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-card p-4 rounded-xl shadow-elegant animate-bounce" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Processing Audio...
              </div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-card p-4 rounded-xl shadow-elegant animate-bounce" style={{ animationDelay: '1.5s' }}>
              <div className="text-sm font-medium text-primary">
                ✓ Minutes Generated
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;