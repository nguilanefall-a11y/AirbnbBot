import LandingHeader from "@/components/LandingHeader";
import LandingHero from "@/components/LandingHero";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ChatDemoSection from "@/components/ChatDemoSection";
import ContactSection from "@/components/ContactSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

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
        <div id="contact">
          <ContactSection />
        </div>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
