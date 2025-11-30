import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-react";
import heroImage from "@assets/generated_images/warm_luxury_airbnb_interior_hd.png";
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
    <div ref={ref} className="relative min-h-screen flex items-center overflow-hidden bg-background">
      <motion.div 
        className="absolute inset-0 z-0"
        style={{ y }}
      >
        {/* Image avec couleurs chaudes et naturelles */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ 
            backgroundImage: `url(${heroImage})`,
            filter: 'brightness(1.0) saturate(1.1) contrast(1.05)'
          }}
        />
        {/* Dark wash overlay for text readability */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.15) 100%)
            `
          }}
        />
        {/* Subtle vignette effect */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.3) 100%)`
          }}
        />
      </motion.div>
      
      {/* Bottom fade to background - stays fixed at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48 z-[5] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.7) 70%, hsl(var(--background)) 100%)'
        }}
      />
      
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
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <span className="text-white/90 font-medium">{t.landing.hero.poweredByAI}</span>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-medium mb-6 leading-tight"
            style={{
              background: 'linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.75) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 4px 24px rgba(255,255,255,0.2))',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {t.landing.hero.title}
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-white/85 mb-8 leading-relaxed drop-shadow-md"
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
            <Link href="/about">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="rounded-full px-8 text-base font-semibold bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
                  data-testid="button-demo"
                >
                  {t.landing.hero.learnMore}
                </Button>
              </motion.div>
            </Link>
          </motion.div>
          
          <motion.div 
            className="mt-8 flex items-center gap-6 text-white/70 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-2 h-2 bg-white rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span>{t.landing.hero.quickSetup}</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-2 h-2 bg-white rounded-full"
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
