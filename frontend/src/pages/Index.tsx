import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Header />
      <main>
        {/* HeroSection accounts for its own top padding (pt-32) */}
        <HeroSection />
        <section id="features">
          <FeaturesSection />
        </section>
        <section id="how-it-works">
          <HowItWorksSection />
        </section>
        <section id="benefits">
          <BenefitsSection />
        </section>
        <CTASection />
      </main>
    </div>
  );
};

export default Index;
