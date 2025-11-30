import { Brain, Clock, Video, Rocket, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import LandingHeader from "@/components/LandingHeader";
import Footer from "@/components/Footer";

const blocks = [
  {
    icon: Brain,
    title: "La fin de la charge mentale",
    description: "Gérer un Airbnb, ce n'est pas seulement changer des draps. C'est surtout répondre aux mêmes questions, encore et encore : « Quel est le code Wifi ? », « Comment marche la machine à café ? », « Où se garer ? ». Notre application supprime cette répétition. En centralisant toutes les infos dans un Lien Voyageur unique, vous anticipez les besoins de vos clients avant même qu'ils ne posent la question."
  },
  {
    icon: Clock,
    title: "L'Arrivée Parfaite (La Règle des 24h)",
    description: "La sécurité est notre priorité. C'est pourquoi nous avons créé le module d'arrivée intelligente. Fini l'envoi de codes sensibles des semaines à l'avance. Notre système débloque automatiquement les instructions d'entrée et la vidéo explicative uniquement la veille de l'arrivée. Votre logement reste sécurisé, et votre voyageur reçoit l'info exactement au moment où il en a besoin."
  },
  {
    icon: Video,
    title: "Une expérience 5 étoiles grâce à la Vidéo",
    description: "Le texte ne suffit pas toujours. Notre plateforme vous permet d'intégrer des vidéos d'accueil personnalisées directement dans le lien du voyageur. Montrez comment ouvrir la boîte à clés ou comment trouver l'entrée difficile. Résultat ? Moins de stress pour eux, et 70% de messages de « panique à l'arrivée » en moins pour vous."
  },
  {
    icon: Rocket,
    title: "L'avenir du Hosting",
    description: "Rejoignez les hôtes qui ont choisi la liberté. En automatisant la communication et l'accès, vous ne gagnez pas seulement du temps, vous offrez une autonomie que les voyageurs modernes adorent. Passez de « Gestionnaire de clés » à « Superhost Serein »."
  }
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main className="pt-20">
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-6 lg:px-12">
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
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Plus qu'un outil, votre <span className="text-primary">Co-hôte Virtuel</span>.
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Découvrez comment nous transformons l'expérience des hôtes Airbnb.
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto space-y-12 lg:space-y-16">
              {blocks.map((block, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col md:flex-row gap-6 items-start p-6 lg:p-8 rounded-2xl bg-card border border-border/50"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                >
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <block.icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
                      {block.title}
                    </h2>
                    <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                      {block.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div 
              className="text-center mt-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Link href="/auth">
                <Button size="lg" className="rounded-full px-8" data-testid="button-start-now">
                  Commencer maintenant
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
