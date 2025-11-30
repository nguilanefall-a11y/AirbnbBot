import FeatureCard from "./FeatureCard";
import { MessageSquareOff, Smile, Video, DoorOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturesSection() {
  const features = [
    {
      icon: MessageSquareOff,
      title: "70% de messages en moins",
      description: "Réduisez drastiquement les questions répétitives. L'IA répond instantanément aux voyageurs, vous libérant des échanges chronophages."
    },
    {
      icon: Smile,
      title: "Satisfaction maximale",
      description: "Les voyageurs préfèrent l'autonomie. Ils obtiennent les réponses immédiatement, sans attendre votre disponibilité."
    },
    {
      icon: Video,
      title: "Vidéo & Multimédia",
      description: "Intégrez des vidéos explicatives dans les liens envoyés à vos voyageurs : visite virtuelle, tutoriel d'entrée, mode d'emploi."
    },
    {
      icon: DoorOpen,
      title: "Arrivée 100% Automatisée",
      description: "Le système gère l'entrée sans intervention humaine. Instructions, codes, vidéos : tout est envoyé au bon moment."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{
              background: 'linear-gradient(to bottom, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Vos Avantages
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une solution complète pour automatiser la communication avec vos voyageurs
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
