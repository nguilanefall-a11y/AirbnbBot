import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";

export default function LandingHeader() {
  const { t } = useLanguage();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Assistant Airbnb IA</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <a 
            href="#features" 
            className="text-sm font-medium hover-elevate px-3 py-2 rounded-md transition-colors"
            data-testid="link-features"
          >
            {t.landing.features.title}
          </a>
          <a 
            href="#how-it-works" 
            className="text-sm font-medium hover-elevate px-3 py-2 rounded-md transition-colors"
            data-testid="link-how-it-works"
          >
            {t.landing.howItWorks.title}
          </a>
          <Link 
            href="/pricing"
            className="text-sm font-medium hover-elevate px-3 py-2 rounded-md transition-colors"
            data-testid="link-pricing"
          >
            {t.landing.pricing.title}
          </Link>
          <a 
            href="#contact" 
            className="text-sm font-medium hover-elevate px-3 py-2 rounded-md transition-colors"
            data-testid="link-contact"
          >
            {t.landing.contact}
          </a>
        </nav>
        
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <ThemeToggle />
          <Link href="/auth">
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-signup"
            >
              {t.auth.register.button}
            </Button>
          </Link>
          <Button 
            size="sm" 
            className="rounded-full"
            data-testid="button-start-trial"
            onClick={() => window.location.href = '/auth'}
          >
            {t.landing.hero.cta}
          </Button>
        </div>
      </div>
    </header>
  );
}
