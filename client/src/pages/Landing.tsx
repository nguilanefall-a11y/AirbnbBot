import LandingHeader from "@/components/LandingHeader";
import LandingHero from "@/components/LandingHero";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ChatDemoSection from "@/components/ChatDemoSection";
import ContactSection from "@/components/ContactSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import waveBackground from "@assets/image_1764527682604.png";

export default function Landing() {
  return (
    <div className="min-h-screen relative">
      {/* Minimalist wave background - fixed behind all content */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${waveBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.15
        }}
      />
      
      <div className="relative z-10">
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
    </div>
  );
}
