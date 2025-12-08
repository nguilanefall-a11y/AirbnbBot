import { motion } from "framer-motion";
import { Star } from "lucide-react";

/**
 * Section "Ils nous font confiance"
 * Affiche les logos des plateformes partenaires et une note marketing
 */
export default function TrustSection() {
  // Logos des plateformes (utilisant des SVG inline pour le style minimaliste)
  const platforms = [
    {
      name: "Airbnb",
      logo: (
        <svg viewBox="0 0 24 24" className="h-8 w-auto" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.7 18.6c-.5.8-1.1 1.4-1.9 1.8-.8.4-1.6.6-2.5.6-.8 0-1.5-.1-2.2-.4-.7-.3-1.3-.7-1.8-1.2-.5.5-1.1.9-1.8 1.2-.7.3-1.4.4-2.2.4-.9 0-1.7-.2-2.5-.6-.8-.4-1.4-1-1.9-1.8-.5-.8-.7-1.7-.7-2.7 0-1.2.4-2.5 1.2-3.9.8-1.4 1.9-2.8 3.4-4.3 1.5-1.5 2.8-2.6 3.9-3.4.2-.2.5-.3.7-.3.3 0 .5.1.7.3 1.1.8 2.4 1.9 3.9 3.4 1.5 1.5 2.6 2.9 3.4 4.3.8 1.4 1.2 2.7 1.2 3.9-.1 1-.3 1.9-.8 2.7zm-5.7-5c-1.5-1.5-2.7-2.9-3.6-4.1-.9-1.2-1.4-2.3-1.4-3.2 0-.6.2-1.1.5-1.5.4-.4.8-.6 1.3-.6.6 0 1.1.2 1.5.7.4.4.7 1 .9 1.6.2.6.3 1.3.4 2 .1.7.2 1.4.4 2.1.2-.7.3-1.4.4-2.1.1-.7.2-1.4.4-2 .2-.6.5-1.1.9-1.6.4-.4.9-.7 1.5-.7.5 0 1 .2 1.3.6.4.4.5.9.5 1.5 0 .9-.5 2-1.4 3.2-.9 1.2-2.1 2.6-3.6 4.1z"/>
        </svg>
      )
    },
    {
      name: "Booking.com",
      logo: (
        <svg viewBox="0 0 24 24" className="h-7 w-auto" fill="currentColor">
          <path d="M2.27 0v24h19.46V0H2.27zm15.03 17.79c-.49.53-1.18.82-2.03.82-.7 0-1.29-.17-1.74-.52v.33h-2.57v-4.5h2.57v.26c.45-.35 1.04-.52 1.74-.52.85 0 1.54.29 2.03.82.5.55.75 1.26.75 2.15s-.25 1.62-.75 2.16zm-.14-7.69c-.47.51-1.12.79-1.95.79-.67 0-1.23-.17-1.67-.5v.31h-2.57V4.12h2.57v2.77c.44-.33 1-.49 1.67-.49.83 0 1.48.27 1.95.78.48.52.73 1.2.73 2.04 0 .85-.25 1.54-.73 2.08z"/>
        </svg>
      )
    },
    {
      name: "Abritel",
      logo: (
        <span className="text-xl font-bold tracking-tight">abritel</span>
      )
    },
    {
      name: "VRBO",
      logo: (
        <span className="text-2xl font-bold tracking-tight">vrbo</span>
      )
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6 lg:px-12">
        {/* Titre */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground/80">
            Ils nous font confiance
          </h2>
          <p className="text-muted-foreground">
            Compatible avec toutes les plateformes de location
          </p>
        </motion.div>

        {/* Logos des plateformes */}
        <motion.div
          className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              className="flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-300 grayscale hover:grayscale-0"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
              title={platform.name}
            >
              {platform.logo}
            </motion.div>
          ))}
        </motion.div>

        {/* Phrase de confiance */}
        <motion.p
          className="text-center text-sm text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Airbnb, Booking, Abritel et VRBO nous font confiance
        </motion.p>

        {/* Note marketing */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= 4.9 ? 'text-amber-500 fill-amber-500' : 'text-amber-500/30 fill-amber-500/30'}`}
                />
              ))}
            </div>
            <span className="font-semibold text-foreground">4,9/5</span>
            <span className="text-sm text-muted-foreground">noté par nos utilisateurs</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

