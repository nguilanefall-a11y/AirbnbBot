import { Brain, Clock, Video, Rocket } from "lucide-react";
import { motion } from "framer-motion";

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

export default function PhilosophySection() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Plus qu'un outil, votre <span className="text-primary">Co-hôte Virtuel</span>.
          </h2>
        </motion.div>

        <div className="grid gap-8 lg:gap-12">
          {blocks.map((block, index) => (
            <motion.div
              key={index}
              className="flex flex-col md:flex-row gap-6 items-start"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <block.icon className="w-7 h-7 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
                  {block.title}
                </h3>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                  {block.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
