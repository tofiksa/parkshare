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
 * Beregner totalpris for en bookingperiode (timebasert)
 */
export function calculateTotalPrice(pricePerHour: number, startTime: Date, endTime: Date): number {
  const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  return Math.round(pricePerHour * hours * 100) / 100 // Avrund til 2 desimaler
}

/**
 * Beregn pris basert på minutter (ON_DEMAND)
 * @param pricePerMinute Pris per minutt
 * @param startTime Starttid
 * @param endTime Sluttid
 * @returns Totalpris avrundet til 2 desimaler
 */
export function calculatePriceByMinutes(
  pricePerMinute: number,
  startTime: Date,
  endTime: Date
): number {
  const durationMs = endTime.getTime() - startTime.getTime()
  const durationMinutes = Math.ceil(durationMs / (1000 * 60)) // Rund opp til nærmeste minutt
  
  // Minimum 1 minutt
  const minutes = Math.max(1, durationMinutes)
  
  return Math.round(pricePerMinute * minutes * 100) / 100 // Avrund til 2 desimaler
}

/**
 * Beregn estimert pris for pågående parkering (ON_DEMAND)
 * @param pricePerMinute Pris per minutt
 * @param startTime Starttid
 * @returns Estimert pris basert på nåværende tid
 */
export function calculateEstimatedPrice(
  pricePerMinute: number,
  startTime: Date
): number {
  const now = new Date()
  const durationMs = now.getTime() - startTime.getTime()
  const durationMinutes = Math.ceil(durationMs / (1000 * 60))
  
  const minutes = Math.max(1, durationMinutes)
  return Math.round(pricePerMinute * minutes * 100) / 100
}

/**
 * Konverter pris per time til pris per minutt
 * @param pricePerHour Pris per time
 * @returns Pris per minutt avrundet til 2 desimaler
 */
export function convertHourlyToMinute(pricePerHour: number): number {
  return Math.round((pricePerHour / 60) * 100) / 100
}

