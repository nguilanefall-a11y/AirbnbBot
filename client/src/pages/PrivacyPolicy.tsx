import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Politique de confidentialité</h1>
          <div></div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Politique de confidentialité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Données collectées</h2>
              <p>Nous collectons les informations suivantes :</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Informations d'identification (nom, email, mot de passe)</li>
                <li>Données de propriété (adresses, descriptions, équipements)</li>
                <li>Données de conversation avec le chatbot</li>
                <li>Données de navigation (cookies, logs)</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Utilisation des données</h2>
              <p>Nous utilisons vos données pour :</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Fournir et améliorer nos services</li>
                <li>Personnaliser votre expérience</li>
                <li>Communiquer avec vous</li>
                <li>Respecter nos obligations légales</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Partage des données</h2>
              <p>
                Nous ne vendons pas vos données personnelles. Nous pouvons partager vos données avec :
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Nos prestataires de services (hébergement, paiement)</li>
                <li>Les autorités légales si requis par la loi</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Vos droits</h2>
              <p>Conformément au RGPD, vous avez le droit de :</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Accéder à vos données personnelles</li>
                <li>Rectifier vos données</li>
                <li>Supprimer vos données</li>
                <li>Vous opposer au traitement de vos données</li>
                <li>Portabilité de vos données</li>
              </ul>
              <p className="mt-4">
                Pour exercer ces droits, contactez-nous à : contact@airbnbassistant.ai
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Sécurité</h2>
              <p>
                Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données personnelles contre 
                l'accès non autorisé, la perte ou la destruction.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
              <p>
                Nous utilisons des cookies pour améliorer votre expérience. 
                Consultez notre <Link href="/legal/cookies" className="text-primary hover:underline">Politique des cookies</Link> pour plus d'informations.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
              <p>
                Pour toute question concernant cette politique, contactez-nous à : contact@airbnbassistant.ai
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

