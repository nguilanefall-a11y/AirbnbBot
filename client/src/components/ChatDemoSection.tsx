import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Zap } from "lucide-react";
import ChatInterface from "./ChatInterface";

export default function ChatDemoSection() {
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
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Testez l'Assistant en Direct
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Découvrez comment l'IA répond instantanément aux questions de vos voyageurs. 
            Posez n'importe quelle question sur l'appartement, les restaurants, les transports, ou votre séjour !
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <motion.div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Zap className="w-4 h-4 text-primary" />
              <span>Réponses instantanées</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-semibold">1000+ questions pré-configurées</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Adaptations en temps réel</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>IA avancée Gemini</span>
            </motion.div>
          </div>
        </motion.div>
        
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <ChatInterface />
        </motion.div>
      </div>
    </section>
  );
}
