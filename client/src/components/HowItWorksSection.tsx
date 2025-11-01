import { Settings, Edit, Zap, Coffee } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      icon: Settings,
      title: "Configuration",
      description: "Créez votre compte et connectez vos propriétés Airbnb"
    },
    {
      number: 2,
      icon: Edit,
      title: "Personnalisation",
      description: "Ajoutez les détails de votre logement et vos règles de maison"
    },
    {
      number: 3,
      icon: Zap,
      title: "Activation",
      description: "Activez l'assistant IA et laissez-le répondre automatiquement"
    },
    {
      number: 4,
      icon: Coffee,
      title: "Détendez-vous",
      description: "Profitez de votre temps pendant que l'IA gère les questions"
    }
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comment Ça Marche ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Quatre étapes simples pour automatiser vos réponses
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-10 h-10 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {step.number}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              
              {step.number < 4 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
