import FeatureCard from "./FeatureCard";
import { Brain, Clock, Globe, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturesSection() {
  const features = [
    {
      icon: Brain,
      title: "Réponses Intelligentes",
      description: "L'IA comprend le contexte et fournit des réponses personnalisées basées sur les informations de votre propriété."
    },
    {
      icon: Clock,
      title: "Disponibilité Instantanée",
      description: "Répondez aux voyageurs 24/7, même pendant votre sommeil. Aucune question ne reste sans réponse."
    },
    {
      icon: Globe,
      title: "Support Multilingue",
      description: "Communiquez avec vos invités dans leur langue maternelle. L'IA détecte et répond en plusieurs langues."
    },
    {
      icon: BookOpen,
      title: "Base de Connaissances",
      description: "Personnalisez les informations sur votre propriété : règles, équipements, check-in, WiFi, et bien plus."
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pourquoi Choisir Notre Assistant IA ?
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
