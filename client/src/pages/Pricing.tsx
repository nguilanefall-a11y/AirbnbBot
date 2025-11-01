import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const plans = [
  {
    id: "free",
    name: "Gratuit",
    price: "0€",
    period: "/mois",
    description: "Parfait pour découvrir le service",
    features: [
      "1 propriété",
      "Conversations illimitées",
      "Assistant IA de base",
      "Support par email",
    ],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "39€",
    period: "/mois",
    description: "Pour les hôtes professionnels",
    features: [
      "5 propriétés",
      "Conversations illimitées",
      "Assistant IA avancé",
      "Support prioritaire",
      "Statistiques détaillées",
      "Personnalisation avancée",
      "7 jours d'essai gratuit",
    ],
    cta: "Essayer 7 jours gratuits",
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: "99€",
    period: "/mois",
    description: "Pour les agences et gestionnaires",
    features: [
      "Propriétés illimitées",
      "Conversations illimitées",
      "Assistant IA premium",
      "Support VIP 24/7",
      "Statistiques avancées",
      "Personnalisation complète",
      "API d'intégration",
      "Formation personnalisée",
      "7 jours d'essai gratuit",
    ],
    cta: "Essayer 7 jours gratuits",
    highlighted: false,
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  const handleSelectPlan = (planId: string) => {
    if (planId === "free") {
      if (isAuthenticated) {
        setLocation("/host");
      } else {
        window.location.href = "/api/login";
      }
    } else {
      if (!isAuthenticated) {
        window.location.href = "/api/login";
      } else {
        setLocation(`/subscribe?plan=${planId}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choisissez votre plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tous les plans payants incluent 7 jours d'essai gratuit. Aucune carte bancaire requise pour le plan gratuit.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.highlighted ? "border-primary shadow-lg" : ""}`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Le plus populaire
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isLoading || (isAuthenticated && user?.plan === plan.id)}
                  data-testid={`button-select-${plan.id}`}
                >
                  {isAuthenticated && user?.plan === plan.id ? "Plan actuel" : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Tous les modes de paiement acceptés : Carte bancaire, SEPA, Apple Pay, Google Pay, et plus.</p>
          <p className="mt-2">Annulez à tout moment. Pas d'engagement.</p>
        </div>
      </div>
    </div>
  );
}
