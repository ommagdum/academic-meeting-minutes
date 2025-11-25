import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Calendar, Users, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-hero-gradient text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main CTA */}
          <div className="mb-16 animate-fade-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Academic Meeting Minutes
              <span className="block">Extractor Project</span>
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Final year engineering project demonstrating AI-powered meeting documentation 
              for academic institutions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary" 
                className="btn-secondary group"
                onClick={() => navigate("/create-meeting")}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Create Meeting
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white text-black border-white hover:bg-transparent hover:text-white"
                onClick={() => {
                  window.location.href = 'mailto:team.meetingminutes@gmail.com';
                }}
              >
                <Mail className="w-5 h-5 mr-2" />
                Contact Team
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">Multi-User Access</h3>
              <p className="text-sm opacity-80">Owner, participant, and viewer roles for secure collaboration</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">Task Tracking</h3>
              <p className="text-sm opacity-80">Automatic action item detection and progress monitoring</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">Meeting Series</h3>
              <p className="text-sm opacity-80">Organize related meetings and maintain institutional continuity</p>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-primary-foreground/10 rounded-2xl p-8 mb-12 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <h3 className="text-2xl font-semibold mb-6">Project Capabilities</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                  <span>Multi-format audio processing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                  <span>AI-powered content extraction</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                  <span>Professional document generation</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                  <span>Task tracking & management</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                  <span>Meeting series organization</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                  <span>Secure role-based access</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="animate-fade-up" style={{ animationDelay: '0.6s' }}>
            <div className="text-sm opacity-90 mb-4">
              Final Year Project by 
              {' '}
              <a href="https://www.linkedin.com/in/om-ml-engg/" className="underline hover:opacity-80" target="_blank">Om</a>,
              {' '}
              <a href="https://www.linkedin.com/in/aniket-magdum-50187028a/" className="underline hover:opacity-80" target="_blank">Aniket</a>,
              {' '}
              <a href="https://www.linkedin.com/in/shreyash-kurade-b46004373/" className="underline hover:opacity-80" target="_blank">Shreyash</a>
              {' '}
              &
              {' '}
              <a href="https://www.instagram.com/mr_prasann13_/" className="underline hover:opacity-80" target="_blank">Prassana</a>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Engineering Team Project
              </div>
              <div className="hidden sm:block">•</div>
              <div>Academic Innovation in AI</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;