import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "wouter";

export default function CTASection() {
  const benefits = [
    "Essai gratuit de 14 jours",
    "Aucune carte de crédit requise",
    "Configuration en 5 minutes",
    "Annulation à tout moment"
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à Automatiser Vos Réponses ?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Rejoignez les hôtes intelligents qui utilisent l'IA pour gérer leurs communications
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          
          <Link href="/chat">
            <Button 
              size="lg" 
              className="rounded-full px-8 text-base font-semibold"
              data-testid="button-cta-start"
            >
              Commencer Gratuitement
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          
          <p className="text-sm text-muted-foreground mt-6">
            Plus de 500 hôtes nous font confiance
          </p>
        </div>
      </div>
    </section>
  );
}
