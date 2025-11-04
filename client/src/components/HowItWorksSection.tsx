import { useLanguage } from "@/contexts/LanguageContext";
import createAccountImg from "@assets/generated_images/Create_account_illustration_681bbd0d.png";
import configureDetailsImg from "@assets/generated_images/Configure_details_illustration_9f38c174.png";
import shareLinkImg from "@assets/generated_images/Share_link_illustration_f205d54c.png";
import relaxImg from "@assets/generated_images/Relax_illustration_ea818164.png";

export default function HowItWorksSection() {
  const { t } = useLanguage();
  
  const steps = [
    {
      number: 1,
      image: createAccountImg,
      title: t.landing.howItWorks.step1.title,
      description: t.landing.howItWorks.step1.description
    },
    {
      number: 2,
      image: configureDetailsImg,
      title: t.landing.howItWorks.step2.title,
      description: t.landing.howItWorks.step2.description
    },
    {
      number: 3,
      image: shareLinkImg,
      title: t.landing.howItWorks.step3.title,
      description: t.landing.howItWorks.step3.description
    },
    {
      number: 4,
      image: relaxImg,
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
                  <div className="w-48 h-48 rounded-lg overflow-hidden bg-background border shadow-sm">
                    <img 
                      src={step.image} 
                      alt={step.title}
                      className="w-full h-full object-cover"
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
