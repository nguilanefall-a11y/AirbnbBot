import FeatureCard from "./FeatureCard";
import { Brain, Clock, Globe, BookOpen } from "lucide-react";

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

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pourquoi Choisir Notre Assistant IA ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une solution complète pour automatiser la communication avec vos voyageurs
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
