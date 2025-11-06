import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* À propos */}
          <div>
            <h3 className="font-semibold text-lg mb-4">À propos</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground transition-colors">
                  Comment ça marche
                </a>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors">
                  Tarifs
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#contact" className="hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="/faq" className="hover:text-foreground transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/support" className="hover:text-foreground transition-colors">
                  Centre d'aide
                </a>
              </li>
            </ul>
          </div>
          
          {/* Légal */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Légal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/legal/terms" className="hover:text-foreground transition-colors">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="hover:text-foreground transition-colors">
                  Politique des cookies
                </Link>
              </li>
              <li>
                <Link href="/legal/legal-notice" className="hover:text-foreground transition-colors">
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Email: contact@airbnbassistant.ai</li>
              <li>Tél: +33 1 23 45 67 89</li>
              <li className="pt-4">
                <div className="flex gap-4">
                  <a href="#" className="hover:text-foreground transition-colors" aria-label="Facebook">
                    Facebook
                  </a>
                  <a href="#" className="hover:text-foreground transition-colors" aria-label="Twitter">
                    Twitter
                  </a>
                  <a href="#" className="hover:text-foreground transition-colors" aria-label="LinkedIn">
                    LinkedIn
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Assistant Airbnb IA. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">
              CGU
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              Confidentialité
            </Link>
            <Link href="/legal/legal-notice" className="hover:text-foreground transition-colors">
              Mentions légales
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

