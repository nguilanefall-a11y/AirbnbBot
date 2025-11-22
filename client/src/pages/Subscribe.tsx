import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

// Initialize Stripe (optional)
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

function CheckoutForm({ plan }: { plan: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/host`,
      },
    });

    if (error) {
      toast({
        title: "Échec du paiement",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      toast({
        title: "Abonnement activé",
        description: "Votre période d'essai de 7 jours commence maintenant!",
      });
      setLocation("/host");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm font-medium mb-2">Période d'essai gratuite de 7 jours</p>
        <p className="text-sm text-muted-foreground">
          Vous ne serez pas facturé aujourd'hui. Après 7 jours, votre abonnement {plan === 'pro' ? 'Pro à 39€' : 'Business à 99€'} /mois débutera automatiquement.
        </p>
      </div>
      
      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        data-testid="button-confirm-subscription"
      >
        {isProcessing ? "Traitement..." : "Démarrer l'essai gratuit de 7 jours"}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Tous les modes de paiement sont acceptés. Annulez à tout moment.
      </p>
    </form>
  );
}

export default function Subscribe() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [plan, setPlan] = useState<string>("pro");

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Stripe non configuré</CardTitle>
            <CardDescription>
              La clé publique Stripe n'est pas configurée. Ajoutez VITE_STRIPE_PUBLIC_KEY à votre fichier .env pour activer l'abonnement.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Non autorisé",
        description: "Vous devez être connecté pour vous abonner.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (isAuthenticated) {
      // Get plan from URL
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get('plan');
      if (planParam && (planParam === 'pro' || planParam === 'business')) {
        setPlan(planParam);
      } else {
        setLocation('/pricing');
        return;
      }

      // Create subscription
      apiRequest("POST", "/api/create-subscription", { plan: planParam })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            toast({
              title: "Erreur",
              description: "Impossible de créer l'abonnement",
              variant: "destructive",
            });
            setLocation('/pricing');
          }
        })
        .catch((error) => {
          console.error("Error creating subscription:", error);
          toast({
            title: "Erreur",
            description: "Impossible de créer l'abonnement",
            variant: "destructive",
          });
          setLocation('/pricing');
        });
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  if (!clientSecret || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" aria-label="Chargement"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>S'abonner au plan {plan === 'pro' ? 'Pro' : 'Business'}</CardTitle>
          <CardDescription>
            Entrez vos informations de paiement pour démarrer votre essai gratuit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm plan={plan} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}
