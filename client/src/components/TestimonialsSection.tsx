import TestimonialCard from "./TestimonialCard";
import avatar1 from "@assets/generated_images/Host_testimonial_avatar_1_478a9f79.png";
import avatar2 from "@assets/generated_images/Host_testimonial_avatar_2_76c6493b.png";

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Marie Dubois",
      propertyType: "Villa en Provence",
      quote: "Cet assistant IA a transformé ma gestion Airbnb. Je reçois moins de questions répétitives et mes invités sont plus satisfaits!",
      avatarUrl: avatar1,
      rating: 5
    },
    {
      name: "Thomas Martin",
      propertyType: "Appartement à Paris",
      quote: "Je gère maintenant 5 propriétés sans stress. L'IA répond instantanément aux questions sur le WiFi, le check-in et les commodités.",
      avatarUrl: avatar2,
      rating: 5
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ce Que Disent Nos Hôtes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Rejoignez des centaines d'hôtes satisfaits
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
