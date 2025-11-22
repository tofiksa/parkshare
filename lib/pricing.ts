/**
 * Prisforslagsalgoritme for parkeringsplasser
 * Basert på lokasjon, type og tidsperiode
 */

export interface PricingFactors {
  type: "UTENDORS" | "INNENDORS"
  latitude: number
  longitude: number
  // Kan utvides med flere faktorer senere
}

/**
 * Beregner foreslått pris per time basert på faktorer
 * Dette er en forenklet versjon - kan utvides med faktiske data senere
 */
export function calculateSuggestedPrice(factors: PricingFactors): number {
  const basePrice = 30 // Base pris i NOK per time
  
  // Innendørs plasser er vanligvis dyrere
  const typeMultiplier = factors.type === "INNENDORS" ? 1.5 : 1.0
  
  // TODO: Legg til geografiske faktorer basert på lokasjon
  // For nå bruker vi base pris med type multiplikator
  
  return Math.round(basePrice * typeMultiplier)
}

/**
 * Beregner totalpris for en bookingperiode
 */
export function calculateTotalPrice(pricePerHour: number, startTime: Date, endTime: Date): number {
  const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  return Math.round(pricePerHour * hours * 100) / 100 // Avrund til 2 desimaler
}

