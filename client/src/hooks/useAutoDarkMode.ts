/**
 * Hook pour le mode sombre automatique basé sur l'heure
 * Active le mode sombre entre 20h et 7h
 */

import { useEffect, useState } from "react";

interface AutoDarkModeOptions {
  startHour?: number; // Heure de début du mode sombre (défaut: 20h)
  endHour?: number;   // Heure de fin du mode sombre (défaut: 7h)
  enabled?: boolean;  // Activer/désactiver l'auto mode
}

export function useAutoDarkMode(options: AutoDarkModeOptions = {}) {
  const { startHour = 20, endHour = 7, enabled = true } = options;
  const [isDark, setIsDark] = useState(false);
  const [isAuto, setIsAuto] = useState(true);

  useEffect(() => {
    if (!enabled || !isAuto) return;

    const checkTime = () => {
      const hour = new Date().getHours();
      const shouldBeDark = hour >= startHour || hour < endHour;
      setIsDark(shouldBeDark);
      
      // Appliquer au document
      if (shouldBeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    // Vérifier immédiatement
    checkTime();

    // Vérifier toutes les minutes
    const interval = setInterval(checkTime, 60000);

    return () => clearInterval(interval);
  }, [enabled, isAuto, startHour, endHour]);

  const toggleDarkMode = () => {
    setIsAuto(false);
    const newDark = !isDark;
    setIsDark(newDark);
    
    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const enableAutoMode = () => {
    setIsAuto(true);
  };

  return {
    isDark,
    isAuto,
    toggleDarkMode,
    enableAutoMode,
  };
}

export default useAutoDarkMode;


