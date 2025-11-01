import LandingHeader from "@/components/LandingHeader";
import LandingHero from "@/components/LandingHero";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ChatDemoSection from "@/components/ChatDemoSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main>
        <LandingHero />
        <div id="features">
          <FeaturesSection />
        </div>
        <div id="how-it-works">
          <HowItWorksSection />
        </div>
        <ChatDemoSection />
        <div id="testimonials">
          <TestimonialsSection />
        </div>
        <CTASection />
      </main>
      <footer className="border-t py-8">
        <div className="container mx-auto px-6 lg:px-12 text-center text-sm text-muted-foreground">
          <p>© 2024 Assistant Airbnb IA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
