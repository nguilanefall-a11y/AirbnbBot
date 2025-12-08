import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Zap, MapPin, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function ChatDemoSection() {
  // Lien vers l'appartement test dans le 8ème
  const testApartmentLink = "/r/demo-paris-01";

  return (
    <section className="py-24 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Démo Interactive</span>
          </motion.div>
          
          <h2 
            className="text-4xl md:text-5xl font-bold mb-6"
            style={{
              background: 'linear-gradient(to bottom, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.65) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Testez l'Assistant en Direct
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Découvrez comment l'IA répond instantanément aux questions de vos voyageurs.
          </p>
        </motion.div>
        
        {/* Carte d'introduction avec CTA */}
        <motion.div 
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background shadow-2xl">
            {/* Effet de glow animé */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 animate-pulse" />
            
            <div className="relative p-8 md:p-12">
              {/* Icône et badge */}
              <div className="flex justify-center mb-6">
                <motion.div
                  className="relative"
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                    <Building2 className="w-10 h-10 text-white" />
                  </div>
                  <Badge className="absolute -top-2 -right-2 bg-green-500 text-white animate-bounce">
                    Live
                  </Badge>
                </motion.div>
              </div>

              {/* Texte principal */}
              <div className="text-center space-y-4 mb-8">
                <h3 className="text-2xl md:text-3xl font-bold">
                  Appartement test disponible
                </h3>
                
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="text-lg">Paris 8ᵉ - Champs-Élysées</span>
                </div>

                <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Vous pouvez tester <strong>dès maintenant</strong> notre assistant IA sur un véritable appartement, 
                  avec toutes les informations déjà enregistrées.
                </p>
              </div>

              {/* Liste des features */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm"><strong>1000+ questions</strong> pré-configurées</span>
                </motion.div>
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm"><strong>Réponses instantanées</strong> en temps réel</span>
                </motion.div>
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm"><strong>Infos complètes</strong> : WiFi, codes, restaurants...</span>
                </motion.div>
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm"><strong>IA avancée</strong> Gemini intégrée</span>
                </motion.div>
              </div>

              {/* Bouton CTA */}
              <div className="flex justify-center">
                <Link href={testApartmentLink}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      size="lg" 
                      className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/80"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Tester l'assistant maintenant
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </Link>
              </div>

              {/* Note en bas */}
              <p className="text-center text-sm text-muted-foreground mt-6">
                Aucune inscription requise • Accès instantané
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Stats en dessous */}
        <motion.div 
          className="flex flex-wrap justify-center gap-8 mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">1000+</div>
            <div className="text-sm text-muted-foreground">Questions configurées</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">&lt;2s</div>
            <div className="text-sm text-muted-foreground">Temps de réponse</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">24/7</div>
            <div className="text-sm text-muted-foreground">Disponibilité</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">50+</div>
            <div className="text-sm text-muted-foreground">Langues supportées</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
