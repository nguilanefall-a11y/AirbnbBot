import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import waveBackground from "@assets/image_1764527682604.png";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();

  const handleStartTrial = () => {
    if (isAuthenticated) {
      setLocation("/host");
    } else {
      window.location.href = "/api/login";
    }
  };

  const features = [
    t.pricingPage.features.unlimitedProperties,
    t.pricingPage.features.unlimitedConversations,
    t.pricingPage.features.aiAssistant,
    t.pricingPage.features.emailSupport,
    t.pricingPage.features.fullManagement,
    t.pricingPage.features.uniqueLinks,
    t.pricingPage.features.modernInterface,
  ];

  // Calculate example prices
  const firstPropertyPrice = 19.90;
  const additionalPropertyPrice = 14.90;
  const calculatePrice = (numProperties: number) => {
    if (numProperties === 0) return 0;
    return firstPropertyPrice + (additionalPropertyPrice * (numProperties - 1));
  };
  
  // Format price according to current language
  const formatPrice = (amount: number) => {
    // Use French format (19,90€) or English format (€19.90) based on language
    const formatted = language === 'fr' || language === 'es' || language === 'it'
      ? `${amount.toFixed(2).replace('.', ',')}€`
      : `€${amount.toFixed(2)}`;
    return formatted;
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Minimalist wave background */}
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
          <h1 
            className="text-4xl font-bold mb-4"
            style={{
              background: 'linear-gradient(to bottom, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t.pricingPage.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.pricingPage.subtitle}
          </p>
        </motion.div>

        <motion.div 
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-primary shadow-lg relative hover-elevate">
            <motion.div 
              className="absolute -top-4 left-1/2 -translate-x-1/2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1 shadow-lg">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                {t.pricingPage.launchOffer}
              </span>
            </motion.div>
            
            <CardHeader className="text-center pb-8">
              <div className="space-y-4">
                <div>
                  <CardTitle className="text-2xl">{t.pricingPage.firstProperty}</CardTitle>
                  <CardDescription className="text-3xl font-bold text-foreground mt-2">
                    {formatPrice(firstPropertyPrice)} <span className="text-base font-normal text-muted-foreground">{t.pricingPage.perMonth}</span>
                  </CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">+</div>
                <div>
                  <CardTitle className="text-xl">{t.pricingPage.additionalProperty}</CardTitle>
                  <CardDescription className="text-2xl font-bold text-foreground mt-2">
                    {formatPrice(additionalPropertyPrice)} <span className="text-base font-normal text-muted-foreground">{t.pricingPage.perMonth}</span>
                  </CardDescription>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium">{t.pricingPage.trialBanner}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.pricingPage.trialDescription}
                </p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">{t.pricingPage.allFeatures}</h3>
                <ul className="space-y-3">
                  {features.map((feature, idx) => (
                    <motion.li 
                      key={idx} 
                      className="flex items-start gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.1, duration: 0.4 }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7 + idx * 0.1, type: "spring" }}
                      >
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      </motion.div>
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">{t.pricingPage.howItWorks.title}</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t.pricingPage.howItWorks.step1}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t.pricingPage.howItWorks.step2}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t.pricingPage.howItWorks.step3firstPart} <strong>{t.pricingPage.howItWorks.step3price}</strong>, {t.pricingPage.howItWorks.step3additional}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t.pricingPage.howItWorks.step4}</span>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleStartTrial}
                data-testid="button-start-trial"
              >
                {t.pricingPage.cta}
              </Button>

              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>{t.pricingPage.examplePrefix} 1 {t.pricingPage.exampleProperty} = {formatPrice(calculatePrice(1))}{t.pricingPage.exampleSuffix}</p>
                <p>{t.pricingPage.examplePrefix} 2 {t.pricingPage.exampleProperties} = {formatPrice(calculatePrice(2))}{t.pricingPage.exampleSuffix}</p>
                <p>{t.pricingPage.examplePrefix} 3 {t.pricingPage.exampleProperties} = {formatPrice(calculatePrice(3))}{t.pricingPage.exampleSuffix}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          className="text-center mt-12 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <Check className="w-4 h-4 text-primary" />
              {t.pricingPage.noCommitment}
            </span>
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <Check className="w-4 h-4 text-primary" />
              Sans carte bancaire requise
            </span>
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <Check className="w-4 h-4 text-primary" />
              Annulation à tout moment
            </span>
          </div>
          <p className="text-xs text-muted-foreground/80">{t.pricingPage.paymentMethods}</p>
        </motion.div>
      </div>
    </div>
  );
}
