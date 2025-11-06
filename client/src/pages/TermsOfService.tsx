import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfService() {
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
          <h1 className="text-xl font-bold">Conditions d'utilisation</h1>
          <div></div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Conditions générales d'utilisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptation des conditions</h2>
              <p>
                En accédant et en utilisant le service Assistant Airbnb IA, vous acceptez d'être lié par ces conditions générales d'utilisation. 
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description du service</h2>
              <p>
                Assistant Airbnb IA est un service d'assistant virtuel alimenté par l'intelligence artificielle pour les propriétaires Airbnb. 
                Le service permet de créer un chatbot personnalisé pour répondre aux questions des voyageurs.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Utilisation du service</h2>
              <p>Vous vous engagez à utiliser le service de manière légale et conforme à ces conditions. Vous vous engagez notamment à :</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Ne pas utiliser le service à des fins illégales ou frauduleuses</li>
                <li>Ne pas tenter d'accéder de manière non autorisée au service</li>
                <li>Ne pas perturber ou endommager le service</li>
                <li>Respecter les droits de propriété intellectuelle</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Compte utilisateur</h2>
              <p>
                Pour utiliser certaines fonctionnalités du service, vous devez créer un compte. 
                Vous êtes responsable de la confidentialité de vos identifiants et de toutes les activités effectuées sous votre compte.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Propriété intellectuelle</h2>
              <p>
                Le service et son contenu sont protégés par le droit d'auteur et autres lois sur la propriété intellectuelle. 
                Vous ne pouvez pas reproduire, modifier, distribuer ou utiliser le service sans autorisation préalable écrite.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Limitation de responsabilité</h2>
              <p>
                Assistant Airbnb IA est fourni "tel quel" sans garantie d'aucune sorte. 
                Nous ne garantissons pas que le service sera ininterrompu, sécurisé ou exempt d'erreurs.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Modification des conditions</h2>
              <p>
                Nous nous réservons le droit de modifier ces conditions à tout moment. 
                Les modifications entreront en vigueur dès leur publication sur le site.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
              <p>
                Pour toute question concernant ces conditions, vous pouvez nous contacter à : contact@airbnbassistant.ai
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

