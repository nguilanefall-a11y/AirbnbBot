import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CookiePolicy() {
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
          <h1 className="text-xl font-bold">Politique des cookies</h1>
          <div></div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Politique des cookies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Qu'est-ce qu'un cookie ?</h2>
              <p>
                Un cookie est un petit fichier texte stocké sur votre appareil lorsque vous visitez un site web. 
                Il permet au site de mémoriser vos actions et préférences pendant une période donnée.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Cookies utilisés</h2>
              <p>Nous utilisons les types de cookies suivants :</p>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement du site</li>
                <li><strong>Cookies de préférences :</strong> Mémorisent vos choix (langue, thème)</li>
                <li><strong>Cookies analytiques :</strong> Nous aident à comprendre comment vous utilisez le site</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Gestion des cookies</h2>
              <p>
                Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur. 
                Cependant, la désactivation de certains cookies peut affecter le fonctionnement du site.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Cookies tiers</h2>
              <p>
                Nous pouvons utiliser des services tiers qui déposent leurs propres cookies. 
                Ces cookies sont soumis aux politiques de confidentialité de ces services.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

