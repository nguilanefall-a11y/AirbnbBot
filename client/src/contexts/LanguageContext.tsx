import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations } from "@/lib/translations";

type TranslationStructure = typeof translations.fr;

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationStructure;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get language from localStorage or default to French (SSR-safe)
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("language");
      return (stored as Language) || "fr";
    }
    return "fr";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
    }
  };

  useEffect(() => {
    // Update document language attribute
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language] as TranslationStructure,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
