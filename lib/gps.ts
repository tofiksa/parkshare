export interface GPSLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

/**
 * Beregn avstand mellom to GPS-koordinater (Haversine formula)
 * Returnerer avstand i kilometer
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Sjekk om bruker er innenfor toleranse
 * @param userLocation Brukerens GPS-posisjon
 * @param targetLocation Målposisjon (parkeringsplass)
 * @param toleranceMeters Toleranse i meter (default: 50)
 * @returns true hvis bruker er innenfor toleranse
 */
export function isWithinTolerance(
  userLocation: GPSLocation,
  targetLocation: GPSLocation,
  toleranceMeters: number = 50
): boolean {
  const distanceKm = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  )
  const distanceMeters = distanceKm * 1000
  return distanceMeters <= toleranceMeters
}

