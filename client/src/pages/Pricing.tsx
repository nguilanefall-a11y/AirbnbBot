import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleStartTrial = () => {
    if (isAuthenticated) {
      setLocation("/host");
    } else {
      window.location.href = "/api/login";
    }
  };

  const features = [
    "Propriétés illimitées",
    "Conversations illimitées avec l'IA",
    "Assistant IA Gemini",
    "Support par email",
    "Gestion complète de vos informations",
    "Liens d'accès uniques pour vos voyageurs",
    "Interface moderne et intuitive",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Tarification simple et transparente</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Essai gratuit de 7 jours, puis payez uniquement pour ce dont vous avez besoin
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="border-primary shadow-lg relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                Offre de lancement
              </span>
            </div>
            
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl">29,90€</CardTitle>
              <CardDescription className="text-lg">par propriété / mois</CardDescription>
              
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium">🎉 Essai gratuit de 7 jours</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aucune carte bancaire requise pour commencer
                </p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Tout ce dont vous avez besoin :</h3>
                <ul className="space-y-3">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Comment ça marche ?</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ Créez votre compte et profitez de 7 jours gratuits</p>
                  <p>✓ Ajoutez autant de propriétés que vous le souhaitez</p>
                  <p>✓ Payez uniquement 29,90€ par propriété après l'essai</p>
                  <p>✓ Annulez à tout moment, sans engagement</p>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleStartTrial}
                data-testid="button-start-trial"
              >
                Commencer l'essai gratuit
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Exemple : 3 propriétés = 89,70€/mois
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 space-y-2 text-sm text-muted-foreground">
          <p>Tous les modes de paiement acceptés : Carte bancaire, SEPA, Apple Pay, Google Pay, et plus.</p>
          <p>Annulez à tout moment. Pas d'engagement. Pas de frais cachés.</p>
        </div>
      </div>
    </div>
  );
}
