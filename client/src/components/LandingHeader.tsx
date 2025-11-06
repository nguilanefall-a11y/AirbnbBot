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
          {!isLoading && !user && (
            <>
              <Link href="/auth">
                <Button variant="ghost" size="sm" data-testid="button-login">
                  Se connecter
                </Button>
              </Link>
              <Link href="/auth">
                <Button 
                  size="sm" 
                  className="rounded-full"
                  data-testid="button-signup"
                >
                  {t.auth.register.button}
                </Button>
              </Link>
            </>
          )}
          {!isLoading && user && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                Importer depuis Airbnb
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/host')}>
                Espace hôte
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 ring-primary transition-all">
                      <AvatarFallback>
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
