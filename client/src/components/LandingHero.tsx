import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-react";
import heroImage from "@assets/generated_images/Airbnb_hero_background_image_5f8c9168.png";
import { Link } from "wouter";

export default function LandingHero() {
  return (
    <div className="relative min-h-[80vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      </div>
      
      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-white/90 font-medium">Propulsé par l'IA</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Votre Assistant Airbnb Intelligent 24/7
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
            Automatisez les réponses aux questions de vos voyageurs grâce à l'intelligence artificielle. 
            Gagnez du temps et offrez une expérience exceptionnelle à vos invités.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link href="/chat">
              <Button 
                size="lg" 
                className="rounded-full px-8 text-base font-semibold"
                data-testid="button-start-free"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Commencer Gratuitement
              </Button>
            </Link>
            <Link href="/host">
              <Button 
                size="lg" 
                variant="outline" 
                className="rounded-full px-8 text-base font-semibold bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
                data-testid="button-demo"
              >
                Espace Hôte
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 flex items-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>Configuration en 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>Sans engagement</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
