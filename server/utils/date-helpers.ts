/**
 * Utilitaires de manipulation de dates
 * Permet de parser de manière sécurisée les dates provenant de sources variées
 */

/**
 * Parse une date de manière sécurisée avec fallback
 * @param value - Valeur à parser (Date, string, ou autre)
 * @param fallback - Date de fallback si le parsing échoue
 * @returns Date valide
 */
export function parseSafeDate(value: any, fallback: Date): Date {
  // Si c'est déjà une Date valide, la retourner
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  // Si c'est une string, tenter de la parser
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Retourner le fallback si rien n'a fonctionné
  return fallback;
}
