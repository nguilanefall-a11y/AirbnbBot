export type Language = 'fr' | 'en' | 'es' | 'de' | 'it';

export const translations = {
  fr: {
    // Landing Page
    landing: {
      hero: {
        title: "Automatisez vos communications Airbnb avec l'IA",
        subtitle: "Un assistant intelligent disponible 24/7 pour répondre à toutes les questions de vos voyageurs",
        cta: "Essai gratuit 7 jours",
        learnMore: "En savoir plus",
        poweredByAI: "Propulsé par l'IA",
        quickSetup: "Configuration en 5 minutes",
        noCommitment: "Sans engagement"
      },
      features: {
        title: "Vos Avantages",
        available247: {
          title: "Disponible 24/7",
          description: "Vos voyageurs obtiennent des réponses instantanées, peu importe l'heure"
        },
        intelligent: {
          title: "Intelligent et Personnalisé",
          description: "L'IA connaît tous les détails de votre propriété et répond avec précision"
        },
        multilingual: {
          title: "Multilingue",
          description: "Communiquez avec vos voyageurs dans leur langue maternelle"
        },
        timesSaving: {
          title: "Gain de temps",
          description: "Libérez-vous des questions répétitives et concentrez-vous sur l'essentiel"
        }
      },
      howItWorks: {
        title: "Fonctionnement",
        subtitle: "Quatre étapes simples",
        step1: {
          title: "Créez votre compte",
          description: "Inscription gratuite en 2 minutes"
        },
        step2: {
          title: "Ajoutez les détails",
          description: "Remplissez les informations de votre propriété"
        },
        step3: {
          title: "Partagez le lien",
          description: "Envoyez le lien unique à vos voyageurs"
        },
        step4: {
          title: "Détendez-vous",
          description: "L'IA gère toutes les conversations"
        }
      },
      pricing: {
        title: "Nos Tarifs",
        cta: "Voir tous les tarifs"
      },
      cta: {
        title: "Prêt à automatiser vos communications ?",
        subtitle: "Rejoignez des centaines d'hôtes qui font confiance à notre assistant IA",
        button: "Commencer gratuitement"
      },
      contact: "Contact"
    },
    // Pricing Page
    pricingPage: {
      title: "Tarification simple et transparente",
      subtitle: "Essai gratuit de 7 jours, puis payez uniquement pour ce dont vous avez besoin",
      launchOffer: "Offre de lancement",
      firstProperty: "Première propriété",
      additionalProperty: "Propriété supplémentaire",
      perMonth: "/ mois",
      trialBanner: "Essai gratuit de 7 jours",
      trialDescription: "Aucune carte bancaire requise pour commencer",
      allFeatures: "Tout ce dont vous avez besoin :",
      features: {
        unlimitedProperties: "Propriétés illimitées",
        unlimitedConversations: "Conversations illimitées avec l'IA",
        aiAssistant: "Assistant IA Gemini",
        emailSupport: "Support par email",
        fullManagement: "Gestion complète de vos informations",
        uniqueLinks: "Liens d'accès uniques pour vos voyageurs",
        modernInterface: "Interface moderne et intuitive"
      },
      howItWorks: {
        title: "Comment ça marche ?",
        step1: "Créez votre compte et profitez de 7 jours gratuits",
        step2: "Ajoutez autant de propriétés que vous le souhaitez",
        step3firstPart: "Payez uniquement",
        step3price: "19,90€ pour la première propriété",
        step3additional: "14,90€ par propriété supplémentaire",
        step4: "Annulez à tout moment, sans engagement"
      },
      cta: "Commencer l'essai gratuit",
      examplePrefix: "Exemple :",
      exampleProperty: "propriété",
      exampleProperties: "propriétés",
      exampleSuffix: "/mois",
      paymentMethods: "Tous les modes de paiement acceptés : Carte bancaire, SEPA, Apple Pay, Google Pay, et plus.",
      noCommitment: "Annulez à tout moment. Pas d'engagement. Pas de frais cachés."
    },
    // Auth Page
    auth: {
      login: {
        title: "Connexion",
        subtitle: "Bienvenue ! Connectez-vous à votre compte",
        email: "Email",
        password: "Mot de passe",
        button: "Se connecter",
        switchToRegister: "Pas encore de compte ? Inscrivez-vous"
      },
      register: {
        title: "Inscription",
        subtitle: "Créez votre compte gratuitement",
        firstName: "Prénom",
        lastName: "Nom",
        email: "Email",
        password: "Mot de passe",
        button: "S'inscrire",
        switchToLogin: "Déjà un compte ? Connectez-vous"
      }
    },
    // Admin Host
    adminHost: {
      title: "Tableau de bord",
      logout: "Déconnexion",
      properties: "Vos Propriétés",
      guestLink: "Lien pour les voyageurs",
      copyLink: "Copier le lien",
      linkCopied: "Lien copié !",
      importAirbnb: "Importer depuis Airbnb",
      tabs: {
        general: "Général",
        checkin: "Check-in/out",
        amenities: "Équipements",
        rules: "Règles",
        useful: "Infos Utiles"
      },
      general: {
        name: "Nom de la propriété",
        description: "Description",
        address: "Adresse",
        floor: "Étage",
        doorCode: "Code porte",
        accessInstructions: "Instructions d'accès"
      },
      checkin: {
        checkInTime: "Heure d'arrivée",
        checkOutTime: "Heure de départ",
        checkInProcedure: "Procédure d'arrivée",
        checkOutProcedure: "Procédure de départ",
        keyLocation: "Emplacement des clés"
      },
      amenities: {
        wifiName: "Nom du WiFi",
        wifiPassword: "Mot de passe WiFi",
        amenities: "Équipements",
        kitchenEquipment: "Équipement cuisine",
        applianceInstructions: "Instructions appareils",
        heatingInstructions: "Instructions chauffage"
      },
      rules: {
        houseRules: "Règles de la maison",
        maxGuests: "Nombre maximum de voyageurs",
        petsAllowed: "Animaux autorisés",
        smokingAllowed: "Fumeurs autorisés",
        partiesAllowed: "Fêtes autorisées",
        garbageInstructions: "Instructions poubelles"
      },
      useful: {
        parkingInfo: "Informations parking",
        publicTransport: "Transports en commun",
        nearbyShops: "Commerces à proximité",
        restaurants: "Restaurants",
        hostName: "Nom de l'hôte",
        hostPhone: "Téléphone de l'hôte",
        emergencyContact: "Contact d'urgence",
        additionalInfo: "Informations supplémentaires",
        faqs: "FAQs"
      }
    },
    // Guest Chat
    guest: {
      startConversation: "Démarrer une conversation",
      enterName: "Entrez votre nom",
      namePlaceholder: "Votre nom",
      start: "Commencer",
      typePlaceholder: "Posez votre question...",
      send: "Envoyer"
    },
    // Common
    common: {
      yes: "Oui",
      no: "Non",
      save: "Enregistrer",
      cancel: "Annuler",
      import: "Importer",
      loading: "Chargement...",
      error: "Erreur",
      success: "Succès"
    }
  },
  en: {
    // Landing Page
    landing: {
      hero: {
        title: "Automate your Airbnb communications with AI",
        subtitle: "An intelligent assistant available 24/7 to answer all your guests' questions",
        cta: "7-day free trial",
        learnMore: "Learn more",
        poweredByAI: "Powered by AI",
        quickSetup: "5-minute setup",
        noCommitment: "No commitment"
      },
      features: {
        title: "Your Benefits",
        available247: {
          title: "Available 24/7",
          description: "Your guests get instant answers, no matter the time"
        },
        intelligent: {
          title: "Intelligent and Personalized",
          description: "AI knows all your property details and responds accurately"
        },
        multilingual: {
          title: "Multilingual",
          description: "Communicate with your guests in their native language"
        },
        timesSaving: {
          title: "Time-saving",
          description: "Free yourself from repetitive questions and focus on what matters"
        }
      },
      howItWorks: {
        title: "How It Works",
        subtitle: "Four simple steps",
        step1: {
          title: "Create your account",
          description: "Free registration in 2 minutes"
        },
        step2: {
          title: "Add details",
          description: "Fill in your property information"
        },
        step3: {
          title: "Share the link",
          description: "Send the unique link to your guests"
        },
        step4: {
          title: "Relax",
          description: "AI handles all conversations"
        }
      },
      pricing: {
        title: "Pricing",
        cta: "See all pricing"
      },
      cta: {
        title: "Ready to automate your communications?",
        subtitle: "Join hundreds of hosts who trust our AI assistant",
        button: "Start for free"
      },
      contact: "Contact"
    },
    // Pricing Page
    pricingPage: {
      title: "Simple and transparent pricing",
      subtitle: "7-day free trial, then pay only for what you need",
      launchOffer: "Launch offer",
      firstProperty: "First property",
      additionalProperty: "Additional property",
      perMonth: "/ month",
      trialBanner: "7-day free trial",
      trialDescription: "No credit card required to start",
      allFeatures: "Everything you need:",
      features: {
        unlimitedProperties: "Unlimited properties",
        unlimitedConversations: "Unlimited AI conversations",
        aiAssistant: "Gemini AI Assistant",
        emailSupport: "Email support",
        fullManagement: "Full information management",
        uniqueLinks: "Unique access links for your guests",
        modernInterface: "Modern and intuitive interface"
      },
      howItWorks: {
        title: "How it works?",
        step1: "Create your account and enjoy 7 days free",
        step2: "Add as many properties as you want",
        step3firstPart: "Pay only",
        step3price: "€19.90 for the first property",
        step3additional: "€14.90 per additional property",
        step4: "Cancel anytime, no commitment"
      },
      cta: "Start free trial",
      examplePrefix: "Example:",
      exampleProperty: "property",
      exampleProperties: "properties",
      exampleSuffix: "/month",
      paymentMethods: "All payment methods accepted: Credit card, SEPA, Apple Pay, Google Pay, and more.",
      noCommitment: "Cancel anytime. No commitment. No hidden fees."
    },
    // Auth Page
    auth: {
      login: {
        title: "Login",
        subtitle: "Welcome! Log in to your account",
        email: "Email",
        password: "Password",
        button: "Log in",
        switchToRegister: "Don't have an account? Sign up"
      },
      register: {
        title: "Sign up",
        subtitle: "Create your free account",
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        password: "Password",
        button: "Sign up",
        switchToLogin: "Already have an account? Log in"
      }
    },
    // Admin Host
    adminHost: {
      title: "Dashboard",
      logout: "Logout",
      properties: "Your Properties",
      guestLink: "Guest Link",
      copyLink: "Copy link",
      linkCopied: "Link copied!",
      importAirbnb: "Import from Airbnb",
      tabs: {
        general: "General",
        checkin: "Check-in/out",
        amenities: "Amenities",
        rules: "Rules",
        useful: "Useful Info"
      },
      general: {
        name: "Property name",
        description: "Description",
        address: "Address",
        floor: "Floor",
        doorCode: "Door code",
        accessInstructions: "Access instructions"
      },
      checkin: {
        checkInTime: "Check-in time",
        checkOutTime: "Check-out time",
        checkInProcedure: "Check-in procedure",
        checkOutProcedure: "Check-out procedure",
        keyLocation: "Key location"
      },
      amenities: {
        wifiName: "WiFi name",
        wifiPassword: "WiFi password",
        amenities: "Amenities",
        kitchenEquipment: "Kitchen equipment",
        applianceInstructions: "Appliance instructions",
        heatingInstructions: "Heating instructions"
      },
      rules: {
        houseRules: "House rules",
        maxGuests: "Maximum guests",
        petsAllowed: "Pets allowed",
        smokingAllowed: "Smoking allowed",
        partiesAllowed: "Parties allowed",
        garbageInstructions: "Garbage instructions"
      },
      useful: {
        parkingInfo: "Parking information",
        publicTransport: "Public transport",
        nearbyShops: "Nearby shops",
        restaurants: "Restaurants",
        hostName: "Host name",
        hostPhone: "Host phone",
        emergencyContact: "Emergency contact",
        additionalInfo: "Additional information",
        faqs: "FAQs"
      }
    },
    // Guest Chat
    guest: {
      startConversation: "Start a conversation",
      enterName: "Enter your name",
      namePlaceholder: "Your name",
      start: "Start",
      typePlaceholder: "Ask your question...",
      send: "Send"
    },
    // Common
    common: {
      yes: "Yes",
      no: "No",
      save: "Save",
      cancel: "Cancel",
      import: "Import",
      loading: "Loading...",
      error: "Error",
      success: "Success"
    }
  },
  es: {
    // Landing Page
    landing: {
      hero: {
        title: "Automatiza tus comunicaciones de Airbnb con IA",
        subtitle: "Un asistente inteligente disponible 24/7 para responder todas las preguntas de tus huéspedes",
        cta: "Prueba gratuita de 7 días",
        learnMore: "Más información",
        poweredByAI: "Impulsado por IA",
        quickSetup: "Configuración en 5 minutos",
        noCommitment: "Sin compromiso"
      },
      features: {
        title: "Tus Ventajas",
        available247: {
          title: "Disponible 24/7",
          description: "Tus huéspedes obtienen respuestas instantáneas, sin importar la hora"
        },
        intelligent: {
          title: "Inteligente y Personalizado",
          description: "La IA conoce todos los detalles de tu propiedad y responde con precisión"
        },
        multilingual: {
          title: "Multilingüe",
          description: "Comunícate con tus huéspedes en su idioma nativo"
        },
        timesSaving: {
          title: "Ahorro de tiempo",
          description: "Libérate de las preguntas repetitivas y concéntrate en lo esencial"
        }
      },
      howItWorks: {
        title: "Funcionamiento",
        subtitle: "Cuatro pasos sencillos",
        step1: {
          title: "Crea tu cuenta",
          description: "Registro gratuito en 2 minutos"
        },
        step2: {
          title: "Añade los detalles",
          description: "Completa la información de tu propiedad"
        },
        step3: {
          title: "Comparte el enlace",
          description: "Envía el enlace único a tus huéspedes"
        },
        step4: {
          title: "Relájate",
          description: "La IA gestiona todas las conversaciones"
        }
      },
      pricing: {
        title: "Precios",
        cta: "Ver todos los precios"
      },
      cta: {
        title: "¿Listo para automatizar tus comunicaciones?",
        subtitle: "Únete a cientos de anfitriones que confían en nuestro asistente IA",
        button: "Comenzar gratis"
      },
      contact: "Contacto"
    },
    // Pricing Page
    pricingPage: {
      title: "Precios simples y transparentes",
      subtitle: "Prueba gratuita de 7 días, luego paga solo por lo que necesitas",
      launchOffer: "Oferta de lanzamiento",
      firstProperty: "Primera propiedad",
      additionalProperty: "Propiedad adicional",
      perMonth: "/ mes",
      trialBanner: "Prueba gratuita de 7 días",
      trialDescription: "No se requiere tarjeta de crédito para comenzar",
      allFeatures: "Todo lo que necesitas:",
      features: {
        unlimitedProperties: "Propiedades ilimitadas",
        unlimitedConversations: "Conversaciones ilimitadas con IA",
        aiAssistant: "Asistente IA Gemini",
        emailSupport: "Soporte por correo electrónico",
        fullManagement: "Gestión completa de tu información",
        uniqueLinks: "Enlaces de acceso únicos para tus huéspedes",
        modernInterface: "Interfaz moderna e intuitiva"
      },
      howItWorks: {
        title: "¿Cómo funciona?",
        step1: "Crea tu cuenta y disfruta de 7 días gratis",
        step2: "Añade tantas propiedades como quieras",
        step3firstPart: "Paga solo",
        step3price: "19,90€ por la primera propiedad",
        step3additional: "14,90€ por propiedad adicional",
        step4: "Cancela en cualquier momento, sin compromiso"
      },
      cta: "Comenzar prueba gratuita",
      examplePrefix: "Ejemplo:",
      exampleProperty: "propiedad",
      exampleProperties: "propiedades",
      exampleSuffix: "/mes",
      paymentMethods: "Todos los métodos de pago aceptados: Tarjeta de crédito, SEPA, Apple Pay, Google Pay y más.",
      noCommitment: "Cancela en cualquier momento. Sin compromiso. Sin cargos ocultos."
    },
    // Auth Page
    auth: {
      login: {
        title: "Iniciar sesión",
        subtitle: "¡Bienvenido! Inicia sesión en tu cuenta",
        email: "Correo electrónico",
        password: "Contraseña",
        button: "Iniciar sesión",
        switchToRegister: "¿No tienes cuenta? Regístrate"
      },
      register: {
        title: "Registro",
        subtitle: "Crea tu cuenta gratis",
        firstName: "Nombre",
        lastName: "Apellido",
        email: "Correo electrónico",
        password: "Contraseña",
        button: "Registrarse",
        switchToLogin: "¿Ya tienes cuenta? Inicia sesión"
      }
    },
    // Admin Host
    adminHost: {
      title: "Panel de control",
      logout: "Cerrar sesión",
      properties: "Tus Propiedades",
      guestLink: "Enlace para huéspedes",
      copyLink: "Copiar enlace",
      linkCopied: "¡Enlace copiado!",
      importAirbnb: "Importar desde Airbnb",
      tabs: {
        general: "General",
        checkin: "Check-in/out",
        amenities: "Servicios",
        rules: "Reglas",
        useful: "Info Útil"
      },
      general: {
        name: "Nombre de la propiedad",
        description: "Descripción",
        address: "Dirección",
        floor: "Piso",
        doorCode: "Código puerta",
        accessInstructions: "Instrucciones de acceso"
      },
      checkin: {
        checkInTime: "Hora de entrada",
        checkOutTime: "Hora de salida",
        checkInProcedure: "Procedimiento de entrada",
        checkOutProcedure: "Procedimiento de salida",
        keyLocation: "Ubicación de las llaves"
      },
      amenities: {
        wifiName: "Nombre del WiFi",
        wifiPassword: "Contraseña WiFi",
        amenities: "Servicios",
        kitchenEquipment: "Equipamiento cocina",
        applianceInstructions: "Instrucciones electrodomésticos",
        heatingInstructions: "Instrucciones calefacción"
      },
      rules: {
        houseRules: "Reglas de la casa",
        maxGuests: "Número máximo de huéspedes",
        petsAllowed: "Mascotas permitidas",
        smokingAllowed: "Fumar permitido",
        partiesAllowed: "Fiestas permitidas",
        garbageInstructions: "Instrucciones basura"
      },
      useful: {
        parkingInfo: "Información estacionamiento",
        publicTransport: "Transporte público",
        nearbyShops: "Tiendas cercanas",
        restaurants: "Restaurantes",
        hostName: "Nombre del anfitrión",
        hostPhone: "Teléfono del anfitrión",
        emergencyContact: "Contacto de emergencia",
        additionalInfo: "Información adicional",
        faqs: "Preguntas frecuentes"
      }
    },
    // Guest Chat
    guest: {
      startConversation: "Iniciar una conversación",
      enterName: "Introduce tu nombre",
      namePlaceholder: "Tu nombre",
      start: "Comenzar",
      typePlaceholder: "Haz tu pregunta...",
      send: "Enviar"
    },
    // Common
    common: {
      yes: "Sí",
      no: "No",
      save: "Guardar",
      cancel: "Cancelar",
      import: "Importar",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito"
    }
  },
  de: {
    // Landing Page
    landing: {
      hero: {
        title: "Automatisieren Sie Ihre Airbnb-Kommunikation mit KI",
        subtitle: "Ein intelligenter Assistent, der 24/7 verfügbar ist, um alle Fragen Ihrer Gäste zu beantworten",
        cta: "7-tägige kostenlose Testversion",
        learnMore: "Mehr erfahren",
        poweredByAI: "Angetrieben von KI",
        quickSetup: "5-Minuten-Einrichtung",
        noCommitment: "Keine Verpflichtung"
      },
      features: {
        title: "Ihre Vorteile",
        available247: {
          title: "Verfügbar 24/7",
          description: "Ihre Gäste erhalten sofortige Antworten, unabhängig von der Uhrzeit"
        },
        intelligent: {
          title: "Intelligent und Personalisiert",
          description: "Die KI kennt alle Details Ihrer Unterkunft und antwortet präzise"
        },
        multilingual: {
          title: "Mehrsprachig",
          description: "Kommunizieren Sie mit Ihren Gästen in ihrer Muttersprache"
        },
        timesSaving: {
          title: "Zeitersparnis",
          description: "Befreien Sie sich von wiederkehrenden Fragen und konzentrieren Sie sich auf das Wesentliche"
        }
      },
      howItWorks: {
        title: "Funktionsweise",
        subtitle: "Vier einfache Schritte",
        step1: {
          title: "Erstellen Sie Ihr Konto",
          description: "Kostenlose Registrierung in 2 Minuten"
        },
        step2: {
          title: "Details hinzufügen",
          description: "Geben Sie die Informationen zu Ihrer Unterkunft ein"
        },
        step3: {
          title: "Link teilen",
          description: "Senden Sie den eindeutigen Link an Ihre Gäste"
        },
        step4: {
          title: "Entspannen",
          description: "Die KI verwaltet alle Gespräche"
        }
      },
      pricing: {
        title: "Preise",
        cta: "Alle Preise anzeigen"
      },
      cta: {
        title: "Bereit, Ihre Kommunikation zu automatisieren?",
        subtitle: "Schließen Sie sich Hunderten von Gastgebern an, die unserem KI-Assistenten vertrauen",
        button: "Kostenlos starten"
      },
      contact: "Kontakt"
    },
    // Pricing Page
    pricingPage: {
      title: "Einfache und transparente Preise",
      subtitle: "7-tägige kostenlose Testversion, dann nur für das bezahlen, was Sie benötigen",
      launchOffer: "Einführungsangebot",
      firstProperty: "Erste Unterkunft",
      additionalProperty: "Zusätzliche Unterkunft",
      perMonth: "/ Monat",
      trialBanner: "7-tägige kostenlose Testversion",
      trialDescription: "Keine Kreditkarte erforderlich",
      allFeatures: "Alles, was Sie brauchen:",
      features: {
        unlimitedProperties: "Unbegrenzte Unterkünfte",
        unlimitedConversations: "Unbegrenzte KI-Konversationen",
        aiAssistant: "Gemini KI-Assistent",
        emailSupport: "E-Mail-Support",
        fullManagement: "Vollständige Informationsverwaltung",
        uniqueLinks: "Eindeutige Zugriffslinks für Ihre Gäste",
        modernInterface: "Moderne und intuitive Benutzeroberfläche"
      },
      howItWorks: {
        title: "Wie funktioniert es?",
        step1: "Erstellen Sie Ihr Konto und genießen Sie 7 Tage kostenlos",
        step2: "Fügen Sie so viele Unterkünfte hinzu, wie Sie möchten",
        step3firstPart: "Zahlen Sie nur",
        step3price: "19,90€ für die erste Unterkunft",
        step3additional: "14,90€ pro zusätzlicher Unterkunft",
        step4: "Jederzeit kündbar, keine Verpflichtung"
      },
      cta: "Kostenlose Testversion starten",
      examplePrefix: "Beispiel:",
      exampleProperty: "Unterkunft",
      exampleProperties: "Unterkünfte",
      exampleSuffix: "/Monat",
      paymentMethods: "Alle Zahlungsmethoden akzeptiert: Kreditkarte, SEPA, Apple Pay, Google Pay und mehr.",
      noCommitment: "Jederzeit kündbar. Keine Verpflichtung. Keine versteckten Gebühren."
    },
    // Auth Page
    auth: {
      login: {
        title: "Anmelden",
        subtitle: "Willkommen! Melden Sie sich bei Ihrem Konto an",
        email: "E-Mail",
        password: "Passwort",
        button: "Anmelden",
        switchToRegister: "Noch kein Konto? Registrieren"
      },
      register: {
        title: "Registrierung",
        subtitle: "Erstellen Sie Ihr kostenloses Konto",
        firstName: "Vorname",
        lastName: "Nachname",
        email: "E-Mail",
        password: "Passwort",
        button: "Registrieren",
        switchToLogin: "Bereits ein Konto? Anmelden"
      }
    },
    // Admin Host
    adminHost: {
      title: "Dashboard",
      logout: "Abmelden",
      properties: "Ihre Unterkünfte",
      guestLink: "Gäste-Link",
      copyLink: "Link kopieren",
      linkCopied: "Link kopiert!",
      importAirbnb: "Von Airbnb importieren",
      tabs: {
        general: "Allgemein",
        checkin: "Check-in/out",
        amenities: "Ausstattung",
        rules: "Regeln",
        useful: "Nützliche Infos"
      },
      general: {
        name: "Name der Unterkunft",
        description: "Beschreibung",
        address: "Adresse",
        floor: "Stockwerk",
        doorCode: "Türcode",
        accessInstructions: "Zugangsanweisungen"
      },
      checkin: {
        checkInTime: "Check-in-Zeit",
        checkOutTime: "Check-out-Zeit",
        checkInProcedure: "Check-in-Verfahren",
        checkOutProcedure: "Check-out-Verfahren",
        keyLocation: "Schlüsselstandort"
      },
      amenities: {
        wifiName: "WiFi-Name",
        wifiPassword: "WiFi-Passwort",
        amenities: "Ausstattung",
        kitchenEquipment: "Küchenausstattung",
        applianceInstructions: "Geräteanweisungen",
        heatingInstructions: "Heizungsanweisungen"
      },
      rules: {
        houseRules: "Hausregeln",
        maxGuests: "Maximale Gästezahl",
        petsAllowed: "Haustiere erlaubt",
        smokingAllowed: "Rauchen erlaubt",
        partiesAllowed: "Partys erlaubt",
        garbageInstructions: "Müllentsorgungsanweisungen"
      },
      useful: {
        parkingInfo: "Parkinformationen",
        publicTransport: "Öffentliche Verkehrsmittel",
        nearbyShops: "Geschäfte in der Nähe",
        restaurants: "Restaurants",
        hostName: "Name des Gastgebers",
        hostPhone: "Telefon des Gastgebers",
        emergencyContact: "Notfallkontakt",
        additionalInfo: "Zusätzliche Informationen",
        faqs: "Häufig gestellte Fragen"
      }
    },
    // Guest Chat
    guest: {
      startConversation: "Gespräch starten",
      enterName: "Geben Sie Ihren Namen ein",
      namePlaceholder: "Ihr Name",
      start: "Starten",
      typePlaceholder: "Stellen Sie Ihre Frage...",
      send: "Senden"
    },
    // Common
    common: {
      yes: "Ja",
      no: "Nein",
      save: "Speichern",
      cancel: "Abbrechen",
      import: "Importieren",
      loading: "Laden...",
      error: "Fehler",
      success: "Erfolg"
    }
  },
  it: {
    // Landing Page
    landing: {
      hero: {
        title: "Automatizza le tue comunicazioni Airbnb con l'IA",
        subtitle: "Un assistente intelligente disponibile 24/7 per rispondere a tutte le domande dei tuoi ospiti",
        cta: "Prova gratuita di 7 giorni",
        learnMore: "Scopri di più",
        poweredByAI: "Alimentato da IA",
        quickSetup: "Configurazione in 5 minuti",
        noCommitment: "Nessun impegno"
      },
      features: {
        title: "I Tuoi Vantaggi",
        available247: {
          title: "Disponibile 24/7",
          description: "I tuoi ospiti ottengono risposte immediate, indipendentemente dall'ora"
        },
        intelligent: {
          title: "Intelligente e Personalizzato",
          description: "L'IA conosce tutti i dettagli della tua proprietà e risponde con precisione"
        },
        multilingual: {
          title: "Multilingue",
          description: "Comunica con i tuoi ospiti nella loro lingua madre"
        },
        timesSaving: {
          title: "Risparmio di tempo",
          description: "Liberati dalle domande ripetitive e concentrati sull'essenziale"
        }
      },
      howItWorks: {
        title: "Funzionamento",
        subtitle: "Quattro semplici passaggi",
        step1: {
          title: "Crea il tuo account",
          description: "Registrazione gratuita in 2 minuti"
        },
        step2: {
          title: "Aggiungi i dettagli",
          description: "Compila le informazioni della tua proprietà"
        },
        step3: {
          title: "Condividi il link",
          description: "Invia il link unico ai tuoi ospiti"
        },
        step4: {
          title: "Rilassati",
          description: "L'IA gestisce tutte le conversazioni"
        }
      },
      pricing: {
        title: "Prezzi",
        cta: "Vedi tutti i prezzi"
      },
      cta: {
        title: "Pronto ad automatizzare le tue comunicazioni?",
        subtitle: "Unisciti a centinaia di host che si fidano del nostro assistente IA",
        button: "Inizia gratis"
      },
      contact: "Contatto"
    },
    // Pricing Page
    pricingPage: {
      title: "Prezzi semplici e trasparenti",
      subtitle: "Prova gratuita di 7 giorni, poi paga solo ciò di cui hai bisogno",
      launchOffer: "Offerta di lancio",
      firstProperty: "Prima proprietà",
      additionalProperty: "Proprietà aggiuntiva",
      perMonth: "/ mese",
      trialBanner: "Prova gratuita di 7 giorni",
      trialDescription: "Nessuna carta di credito richiesta per iniziare",
      allFeatures: "Tutto ciò di cui hai bisogno:",
      features: {
        unlimitedProperties: "Proprietà illimitate",
        unlimitedConversations: "Conversazioni illimitate con IA",
        aiAssistant: "Assistente IA Gemini",
        emailSupport: "Supporto via email",
        fullManagement: "Gestione completa delle informazioni",
        uniqueLinks: "Link di accesso unici per i tuoi ospiti",
        modernInterface: "Interfaccia moderna e intuitiva"
      },
      howItWorks: {
        title: "Come funziona?",
        step1: "Crea il tuo account e goditi 7 giorni gratis",
        step2: "Aggiungi tutte le proprietà che desideri",
        step3firstPart: "Paga solo",
        step3price: "19,90€ per la prima proprietà",
        step3additional: "14,90€ per proprietà aggiuntiva",
        step4: "Annulla in qualsiasi momento, nessun impegno"
      },
      cta: "Inizia prova gratuita",
      examplePrefix: "Esempio:",
      exampleProperty: "proprietà",
      exampleProperties: "proprietà",
      exampleSuffix: "/mese",
      paymentMethods: "Tutti i metodi di pagamento accettati: Carta di credito, SEPA, Apple Pay, Google Pay e altro.",
      noCommitment: "Annulla in qualsiasi momento. Nessun impegno. Nessun costo nascosto."
    },
    // Auth Page
    auth: {
      login: {
        title: "Accedi",
        subtitle: "Benvenuto! Accedi al tuo account",
        email: "Email",
        password: "Password",
        button: "Accedi",
        switchToRegister: "Non hai un account? Registrati"
      },
      register: {
        title: "Registrati",
        subtitle: "Crea il tuo account gratuito",
        firstName: "Nome",
        lastName: "Cognome",
        email: "Email",
        password: "Password",
        button: "Registrati",
        switchToLogin: "Hai già un account? Accedi"
      }
    },
    // Admin Host
    adminHost: {
      title: "Pannello di controllo",
      logout: "Disconnetti",
      properties: "Le tue Proprietà",
      guestLink: "Link per gli ospiti",
      copyLink: "Copia link",
      linkCopied: "Link copiato!",
      importAirbnb: "Importa da Airbnb",
      tabs: {
        general: "Generale",
        checkin: "Check-in/out",
        amenities: "Servizi",
        rules: "Regole",
        useful: "Info Utili"
      },
      general: {
        name: "Nome della proprietà",
        description: "Descrizione",
        address: "Indirizzo",
        floor: "Piano",
        doorCode: "Codice porta",
        accessInstructions: "Istruzioni di accesso"
      },
      checkin: {
        checkInTime: "Orario di check-in",
        checkOutTime: "Orario di check-out",
        checkInProcedure: "Procedura di check-in",
        checkOutProcedure: "Procedura di check-out",
        keyLocation: "Posizione delle chiavi"
      },
      amenities: {
        wifiName: "Nome WiFi",
        wifiPassword: "Password WiFi",
        amenities: "Servizi",
        kitchenEquipment: "Attrezzatura cucina",
        applianceInstructions: "Istruzioni elettrodomestici",
        heatingInstructions: "Istruzioni riscaldamento"
      },
      rules: {
        houseRules: "Regole della casa",
        maxGuests: "Numero massimo di ospiti",
        petsAllowed: "Animali ammessi",
        smokingAllowed: "Fumo permesso",
        partiesAllowed: "Feste permesse",
        garbageInstructions: "Istruzioni spazzatura"
      },
      useful: {
        parkingInfo: "Informazioni parcheggio",
        publicTransport: "Trasporti pubblici",
        nearbyShops: "Negozi nelle vicinanze",
        restaurants: "Ristoranti",
        hostName: "Nome dell'host",
        hostPhone: "Telefono dell'host",
        emergencyContact: "Contatto di emergenza",
        additionalInfo: "Informazioni aggiuntive",
        faqs: "Domande frequenti"
      }
    },
    // Guest Chat
    guest: {
      startConversation: "Inizia una conversazione",
      enterName: "Inserisci il tuo nome",
      namePlaceholder: "Il tuo nome",
      start: "Inizia",
      typePlaceholder: "Fai la tua domanda...",
      send: "Invia"
    },
    // Common
    common: {
      yes: "Sì",
      no: "No",
      save: "Salva",
      cancel: "Annulla",
      import: "Importa",
      loading: "Caricamento...",
      error: "Errore",
      success: "Successo"
    }
  }
} as const;

export const languageNames: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano'
};
