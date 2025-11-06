import { useLanguage } from "@/contexts/LanguageContext";
import relaxFallback from "@assets/generated_images/Relax_illustration_ea818164.png";

export default function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    {
      number: 1,
      // Partager le lien aux voyageurs (mobile + lien)
      image: "https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?q=80&w=2000&auto=format&fit=crop",
      title: t.landing.howItWorks.step1.title,
      description: t.landing.howItWorks.step1.description
    },
    {
      number: 2,
      // Configurer les infos du logement (formulaires / paramètres)
      image: "https://images.unsplash.com/photo-1519947486511-46149fa0a254?q=80&w=2000&auto=format&fit=crop",
      title: t.landing.howItWorks.step2.title,
      description: t.landing.howItWorks.step2.description
    },
    {
      number: 3,
      // Détente / séjour serein - homme détendu
      image: "https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=2000&auto=format&fit=crop",
      title: t.landing.howItWorks.step3.title,
      description: t.landing.howItWorks.step3.description
    },
    {
      number: 4,
      // Image personnalisée 4K - femme détendue dans salon moderne avec robot/IA
      image: "/hiw-step4.jpg",
      title: t.landing.howItWorks.step4.title,
      description: t.landing.howItWorks.step4.description
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.landing.howItWorks.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.landing.howItWorks.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-56 h-40 rounded-lg overflow-hidden bg-background border shadow-sm">
                    <img 
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = relaxFallback; }}
                    />
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-lg">
                    {step.number}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              
              {step.number < 4 && (
                <div className="hidden lg:block absolute top-24 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
