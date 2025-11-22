import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LegalNotice() {
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
          <h1 className="text-xl font-bold">Mentions légales</h1>
          <div></div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Mentions légales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 prose prose-sm max-w-none">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Éditeur du site</h2>
              <p>
                Le site Assistant Airbnb IA est édité par :
              </p>
              <p className="ml-4">
                <strong>Assistant Airbnb IA</strong><br />
                Email : contact@airbnbassistant.ai<br />
                Téléphone : +33 1 23 45 67 89
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Directeur de publication</h2>
              <p>Le directeur de publication est : [Nom du directeur de publication]</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Hébergement</h2>
              <p>
                Le site est hébergé par :
              </p>
              <p className="ml-4">
                [Nom de l'hébergeur]<br />
                [Adresse de l'hébergeur]
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Propriété intellectuelle</h2>
              <p>
                L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. 
                Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Protection des données personnelles</h2>
              <p>
                Conformément à la loi « Informatique et Libertés » du 6 janvier 1978 modifiée et au Règlement Général sur la Protection des Données (RGPD), 
                vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.
              </p>
              <p>
                Pour exercer ce droit, vous pouvez nous contacter à l'adresse : contact@airbnbassistant.ai
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
              <p>
                Le site utilise des cookies pour améliorer l'expérience utilisateur. 
                Vous pouvez consulter notre <Link href="/legal/cookies" className="text-primary hover:underline">Politique des cookies</Link> pour plus d'informations.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Limitation de responsabilité</h2>
              <p>
                Assistant Airbnb IA ne pourra être tenu responsable des dommages directs et indirects causés au matériel de l'utilisateur, 
                lors de l'accès au site, et résultant soit de l'utilisation d'un matériel ne répondant pas aux spécifications, 
                soit de l'apparition d'un bug ou d'une incompatibilité.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

