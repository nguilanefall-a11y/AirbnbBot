import { Button } from "@/components/ui/button";
import { MessageSquare, Settings } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { ImportAirbnbDialog } from "@/components/ImportAirbnbDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LandingHeader() {
  const { t } = useLanguage();
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showImport, setShowImport] = useState(false);
  
  return (
    <header className="absolute top-0 left-0 right-0 z-50 w-full">
      {/* Gradient overlay for text readability */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
          height: '120px'
        }}
      />
      <div className="container mx-auto px-6 lg:px-12 h-16 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white drop-shadow-md">Assistant Airbnb IA</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <a 
            href="#features" 
            className="text-sm font-medium text-white/90 hover:text-white px-3 py-2 rounded-md transition-colors drop-shadow-sm"
            data-testid="link-features"
          >
            {t.landing.features.title}
          </a>
          <a 
            href="#how-it-works" 
            className="text-sm font-medium text-white/90 hover:text-white px-3 py-2 rounded-md transition-colors drop-shadow-sm"
            data-testid="link-how-it-works"
          >
            {t.landing.howItWorks.title}
          </a>
          <Link 
            href="/pricing"
            className="text-sm font-medium text-white/90 hover:text-white px-3 py-2 rounded-md transition-colors drop-shadow-sm"
            data-testid="link-pricing"
          >
            {t.landing.pricing.title}
          </Link>
          <a 
            href="#contact" 
            className="text-sm font-medium text-white/90 hover:text-white px-3 py-2 rounded-md transition-colors drop-shadow-sm"
            data-testid="link-contact"
          >
            {t.landing.contact}
          </a>
        </nav>
        
        <div className="flex items-center gap-3">
          <LanguageSelector variant="light" />
          <ThemeToggle variant="light" />
          {!isLoading && !user && (
            <>
              <Link href="/auth">
                <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10" data-testid="button-login">
                  Se connecter
                </Button>
              </Link>
              <Link href="/auth">
                <Button 
                  size="sm" 
                  className="rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30"
                  data-testid="button-signup"
                >
                  {t.auth.register.button}
                </Button>
              </Link>
            </>
          )}
          {!isLoading && user && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20" onClick={() => setShowImport(true)}>
                Importer depuis Airbnb
              </Button>
              <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10" onClick={() => setLocation('/host')}>
                Espace hôte
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 ring-white/50 transition-all border border-white/30">
                      <AvatarFallback className="bg-white/20 text-white">
                        {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                             <p className="text-sm font-medium leading-none">
                               {user.firstName || user.email}
                             </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/host')}>
                    Espace hôte
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    fetch('/api/logout', { method: 'POST', credentials: 'include' })
                      .then(() => window.location.href = '/');
                  }}>
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      <ImportAirbnbDialog open={showImport} onOpenChange={setShowImport} />
    </header>
  );
}
