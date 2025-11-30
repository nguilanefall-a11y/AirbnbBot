import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-react";
import heroImage from "@assets/generated_images/minimalist_luxury_living_room.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function LandingHero() {
  const { t } = useLanguage();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div ref={ref} className="relative min-h-[80vh] flex items-center overflow-hidden bg-background">
      <motion.div 
        className="absolute inset-0 z-0"
        style={{ y }}
      >
        {/* Image avec effet éthéré et lumineux */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ 
            backgroundImage: `url(${heroImage})`,
            filter: 'brightness(1.15) saturate(0.9)'
          }}
        />
        {/* Halo lumineux progressif sur les bords - effet éthéré */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, hsl(var(--background)) 85%),
              linear-gradient(to top, hsl(var(--background)) 0%, transparent 25%),
              linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 20%),
              linear-gradient(to left, hsl(var(--background)) 0%, transparent 15%),
              linear-gradient(to right, hsl(var(--background)) 0%, transparent 15%)
            `
          }}
        />
        {/* Overlay doux pour le texte */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-background/30 to-transparent" />
      </motion.div>
      
      <motion.div 
        className="container mx-auto px-6 lg:px-12 relative z-10"
        style={{ opacity }}
      >
        <div className="max-w-3xl">
          <motion.div 
            className="flex items-center gap-2 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <Sparkles className="w-6 h-6 text-primary" />
            </motion.div>
            <span className="text-foreground/80 font-medium">{t.landing.hero.poweredByAI}</span>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {t.landing.hero.title}
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {t.landing.hero.subtitle}
          </motion.p>
          
          <motion.div 
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link href="/auth">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  className="rounded-full px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  data-testid="button-start-free"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {t.landing.hero.cta}
                </Button>
              </motion.div>
            </Link>
            <a href="#features">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="rounded-full px-8 text-base font-semibold"
                  data-testid="button-demo"
                >
                  {t.landing.hero.learnMore}
                </Button>
              </motion.div>
            </a>
          </motion.div>
          
          <motion.div 
            className="mt-8 flex items-center gap-6 text-muted-foreground text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-2 h-2 bg-primary rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span>{t.landing.hero.quickSetup}</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-2 h-2 bg-primary rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              />
              <span>{t.landing.hero.noCommitment}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
