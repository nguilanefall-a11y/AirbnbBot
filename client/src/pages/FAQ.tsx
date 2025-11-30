import { motion } from "framer-motion";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import waveBackground from "@assets/image_1764527682604.png";
import Footer from "@/components/Footer";

const faqCategories = [
  {
    title: "Sécurité & Confidentialité",
    questions: [
      {
        q: "Est-ce sécurisé ?",
        a: "Oui, absolument. Toutes les communications sont chiffrées de bout en bout. Vos données sont hébergées sur des serveurs européens conformes au RGPD. Nous ne partageons jamais vos informations avec des tiers."
      },
      {
        q: "Mes voyageurs ont-ils accès à mes informations personnelles ?",
        a: "Non. Les voyageurs n'ont accès qu'aux informations que vous choisissez de partager concernant le logement. Vos coordonnées personnelles restent privées à moins que vous ne décidiez de les inclure."
      },
      {
        q: "Comment sont protégées mes données bancaires ?",
        a: "Les paiements sont gérés par Stripe, leader mondial du paiement sécurisé. Nous n'avons jamais accès à vos données bancaires complètes."
      }
    ]
  },
  {
    title: "Fonctionnement du Lien Voyageur",
    questions: [
      {
        q: "Comment fonctionne le lien voyageur ?",
        a: "Pour chaque propriété, vous recevez un lien unique à partager avec vos voyageurs. En cliquant dessus, ils accèdent directement à l'assistant IA de votre logement, sans création de compte nécessaire."
      },
      {
        q: "Puis-je personnaliser le lien pour chaque réservation ?",
        a: "Le lien est actuellement par propriété. Une fonctionnalité de liens uniques par réservation (via synchronisation iCal) est prévue pour permettre un contrôle plus fin des accès."
      },
      {
        q: "Les voyageurs peuvent-ils accéder à d'autres propriétés ?",
        a: "Non. Chaque lien est strictement limité à une seule propriété. Un voyageur ne peut jamais voir les informations d'un autre logement."
      }
    ]
  },
  {
    title: "Configuration & Personnalisation",
    questions: [
      {
        q: "Puis-je changer la vidéo d'accueil ?",
        a: "Oui ! Dans l'onglet 'Arrivée' de votre tableau de bord, vous pouvez ajouter ou modifier une vidéo YouTube ou Loom pour accueillir vos voyageurs. Cette vidéo ne sera visible que dans les 24h précédant le check-in."
      },
      {
        q: "Comment modifier les informations de mon logement ?",
        a: "Toutes les informations sont modifiables dans votre Espace Hôte. Les changements sont sauvegardés automatiquement et l'IA utilise immédiatement les nouvelles données."
      },
      {
        q: "L'IA peut-elle répondre dans plusieurs langues ?",
        a: "Oui ! L'assistant détecte automatiquement la langue du voyageur et répond dans cette même langue. Plus de 50 langues sont supportées."
      }
    ]
  },
  {
    title: "Compatibilité & Intégrations",
    questions: [
      {
        q: "Cela fonctionne-t-il avec Booking.com ?",
        a: "Oui, le lien voyageur peut être partagé sur n'importe quelle plateforme : Airbnb, Booking.com, Abritel, ou en direct. Le système est indépendant des plateformes de réservation."
      },
      {
        q: "Puis-je utiliser l'assistant pour mes réservations directes ?",
        a: "Absolument ! L'assistant fonctionne parfaitement pour les réservations directes. Vous pouvez envoyer le lien par email, SMS, WhatsApp ou l'intégrer à votre propre site web."
      },
      {
        q: "Y a-t-il une application mobile ?",
        a: "L'interface est entièrement responsive et fonctionne parfaitement sur mobile. Une application dédiée est en cours de développement pour une expérience encore plus fluide."
      }
    ]
  },
  {
    title: "Tarifs & Abonnement",
    questions: [
      {
        q: "Comment fonctionne l'essai gratuit ?",
        a: "Vous bénéficiez de 7 jours d'essai gratuit sans engagement et sans carte bancaire. Pendant cette période, vous avez accès à toutes les fonctionnalités."
      },
      {
        q: "Puis-je annuler à tout moment ?",
        a: "Oui, vous pouvez annuler votre abonnement à tout moment depuis votre espace. Aucun frais de résiliation, aucune question posée."
      },
      {
        q: "Comment ajouter une nouvelle propriété ?",
        a: "Depuis votre Espace Hôte, cliquez sur 'Ajouter une propriété'. Chaque propriété supplémentaire après la première est facturée 14,90€/mois."
      }
    ]
  }
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background relative">
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${waveBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.45
        }}
      />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/">
            <Button variant="ghost" className="mb-8 gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </motion.div>

        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Centre d'aide</span>
          </div>
          <h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              background: 'linear-gradient(to bottom, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Foire Aux Questions
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trouvez rapidement les réponses à vos questions les plus fréquentes
          </p>
        </motion.div>

        <motion.div 
          className="max-w-3xl mx-auto space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {faqCategories.map((category, catIdx) => (
            <div key={catIdx} className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground/90 border-b pb-2">
                {category.title}
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {category.questions.map((item, idx) => (
                  <AccordionItem 
                    key={idx} 
                    value={`cat-${catIdx}-item-${idx}`}
                    className="border rounded-lg px-4 bg-card/50 backdrop-blur-sm"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4" data-testid={`faq-question-${catIdx}-${idx}`}>
                      <span className="font-medium">{item.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </motion.div>

        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas trouvé votre réponse ?
          </p>
          <Link href="/aide">
            <Button variant="outline" data-testid="button-help-center">
              Accéder au Centre d'Aide
            </Button>
          </Link>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
}
