import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, User, Wrench, MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import waveBackground from "@assets/image_1764527682604.png";
import Footer from "@/components/Footer";

const helpCategories = [
  {
    icon: BookOpen,
    title: "Guide de démarrage",
    description: "Premiers pas avec l'assistant IA",
    articles: [
      { title: "Créer votre compte", content: "Pour commencer, rendez-vous sur la page d'inscription et créez votre compte avec votre email. Vous recevrez un email de confirmation pour activer votre espace." },
      { title: "Ajouter votre première propriété", content: "Depuis votre Espace Hôte, cliquez sur 'Nouvelle propriété' et remplissez les informations de base : nom, adresse, et description. L'assistant utilisera ces informations pour répondre aux questions de vos voyageurs." },
      { title: "Configurer les informations du logement", content: "Parcourez les différents onglets (Check-in/out, Équipements, Règles, etc.) pour enrichir les connaissances de l'IA. Plus vous fournissez d'informations, plus les réponses seront précises et utiles." },
      { title: "Partager le lien avec vos voyageurs", content: "Copiez le lien unique de votre propriété et envoyez-le à vos voyageurs par email, SMS ou via la messagerie Airbnb. Ils pourront poser leurs questions instantanément." }
    ]
  },
  {
    icon: User,
    title: "Mon Compte",
    description: "Gérer votre profil et vos paramètres",
    articles: [
      { title: "Modifier mes informations personnelles", content: "Accédez à la section Paramètres de votre compte pour modifier votre email, mot de passe ou informations de contact. Les changements sont appliqués immédiatement." },
      { title: "Gérer mon abonnement", content: "Depuis les paramètres de votre compte, vous pouvez visualiser votre plan actuel, ajouter ou supprimer des propriétés, et gérer vos informations de paiement." },
      { title: "Réinitialiser mon mot de passe", content: "Si vous avez oublié votre mot de passe, utilisez le lien 'Mot de passe oublié' sur la page de connexion. Vous recevrez un email avec les instructions de réinitialisation." },
      { title: "Supprimer mon compte", content: "Vous pouvez demander la suppression de votre compte en nous contactant. Toutes vos données seront effacées conformément au RGPD sous 30 jours." }
    ]
  },
  {
    icon: Wrench,
    title: "Support Technique",
    description: "Résoudre les problèmes courants",
    articles: [
      { title: "L'IA ne répond pas correctement", content: "Vérifiez que les informations de votre propriété sont bien renseignées dans l'onglet concerné. L'IA ne peut répondre qu'avec les données que vous lui fournissez. Essayez d'enrichir les sections correspondantes." },
      { title: "Le lien voyageur ne fonctionne pas", content: "Assurez-vous de copier le lien complet depuis votre Espace Hôte. Si le problème persiste, régénérez un nouveau lien depuis les paramètres de la propriété." },
      { title: "Problèmes de connexion", content: "Videz le cache de votre navigateur et réessayez. Si le problème persiste, essayez un autre navigateur ou contactez notre support." },
      { title: "La vidéo d'arrivée ne s'affiche pas", content: "Vérifiez que l'URL de la vidéo est correcte (YouTube ou Loom). La vidéo n'est visible que dans les 24h précédant le check-in configuré." }
    ]
  }
];

export default function HelpCenter() {
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
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Assistance</span>
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
            Centre d'Aide
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Guides, tutoriels et support pour vous accompagner
          </p>
        </motion.div>

        <motion.div 
          className="max-w-5xl mx-auto space-y-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {helpCategories.map((category, catIdx) => (
            <div key={catIdx} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{category.title}</h2>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {category.articles.map((article, idx) => (
                  <Card 
                    key={idx} 
                    className="bg-card/50 backdrop-blur-sm hover-elevate cursor-pointer transition-all"
                    data-testid={`help-article-${catIdx}-${idx}`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium">{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">
                        {article.content}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div 
          className="max-w-3xl mx-auto mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Besoin d'aide supplémentaire ?</CardTitle>
              <CardDescription>Notre équipe support est là pour vous aider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="outline" className="gap-2" data-testid="button-contact-email">
                  <Mail className="w-4 h-4" />
                  contact@assistantairbnb.ai
                </Button>
                <Link href="/faq">
                  <Button variant="outline" className="gap-2" data-testid="button-faq">
                    <BookOpen className="w-4 h-4" />
                    Consulter la FAQ
                  </Button>
                </Link>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Temps de réponse moyen : moins de 24h
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
}
