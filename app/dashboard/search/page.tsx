"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import Navigation from "@/components/Navigation"

// Dynamisk import av Leaflet for å unngå SSR problemer
const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-200 animate-pulse flex items-center justify-center">Laster kart...</div>,
})

interface ParkingSpot {
  id: string
  type: "UTENDORS" | "INNENDORS"
  address: string
  latitude: number | null
  longitude: number | null
  imageUrl: string | null
  pricePerHour: number
  description: string | null
  user: {
    name: string
  }
}

export default function SearchPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([])
  const [loading, setLoading] = useState(true) // Start med loading=true
  const [error, setError] = useState("")
  const parkingSpotsRef = useRef<ParkingSpot[]>([]) // Ref for å holde styr på eksisterende data
  const [filters, setFilters] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    maxPrice: "",
    type: "" as "" | "UTENDORS" | "INNENDORS",
    maxDistance: "5",
  })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasSearchedRef = useRef(false)

  const searchParkingSpots = useCallback(async () => {
    // Opprett ny abort controller FØR vi kansellerer den gamle
    const abortController = new AbortController()
    const previousController = abortControllerRef.current
    abortControllerRef.current = abortController

    // Kanseller forrige request, men ikke hvis den allerede er ferdig
    if (previousController && !previousController.signal.aborted) {
      previousController.abort()
    }

    setLoading(true)
    setError("")
    
    // Sett en timeout for å unngå at loading forblir true hvis noe går galt
    const loadingTimeout = setTimeout(() => {
      if (!abortController.signal.aborted) {
        setLoading(false)
      }
    }, 10000) // 10 sekunder timeout

    try {
      const params = new URLSearchParams()

      if (userLocation) {
        params.append("latitude", userLocation.lat.toString())
        params.append("longitude", userLocation.lng.toString())
      }

      if (filters.startDate && filters.startTime && filters.endDate && filters.endTime) {
        const startDateTime = new Date(`${filters.startDate}T${filters.startTime}`)
        const endDateTime = new Date(`${filters.endDate}T${filters.endTime}`)
        params.append("startTime", startDateTime.toISOString())
        params.append("endTime", endDateTime.toISOString())
      }

      if (filters.maxPrice) {
        params.append("maxPrice", filters.maxPrice)
      }

      // Bare legg til type hvis den faktisk er valgt (ikke tom streng)
      if (filters.type) {
        params.append("type", filters.type)
      }

      // Kun legg til maxDistance hvis brukeren har GPS-koordinater
      // Hvis ikke, vis alle plasser uavhengig av avstand
      if (userLocation && filters.maxDistance) {
        params.append("maxDistance", filters.maxDistance)
      }

      const response = await fetch(`/api/parking-spots/search?${params.toString()}`, {
        signal: abortController.signal,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Ukjent feil" }))
        throw new Error(errorData.error || "Kunne ikke søke etter parkeringsplasser")
      }

      const data = await response.json()
      
      // Bare oppdater hvis request ikke er kansellert
      if (!abortController.signal.aborted) {
        clearTimeout(loadingTimeout)
        // Sørg for at data er en array
        const spots = Array.isArray(data) ? data : []
        // Oppdater state og ref
        // Hvis vi har data, oppdater alltid. Hvis tom, kun oppdater hvis vi ikke har data fra før
        if (spots.length > 0 || parkingSpotsRef.current.length === 0) {
          setParkingSpots(spots)
          parkingSpotsRef.current = spots
        }
        hasSearchedRef.current = true
        setLoading(false)
      }
    } catch (err) {
      clearTimeout(loadingTimeout)
      // Ignorer abort errors
      if (err instanceof Error && err.name === "AbortError") {
        return
      }
      
      const errorMessage = err instanceof Error ? err.message : "Kunne ikke laste parkeringsplasser"
      setError(errorMessage)
      setLoading(false)
      
      // IKKE tøm parkeringsplasser ved feil - behold eksisterende data
      // Dette sikrer at data ikke forsvinner hvis et nytt søk feiler
      // Kun oppdater hvis vi ikke har noen data fra før
      if (parkingSpotsRef.current.length === 0) {
        setParkingSpots([])
      }
      
      if (process.env.NODE_ENV === "development") {
        console.error("Error searching parking spots:", err)
      }
    }
  }, [userLocation, filters])

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          // Silently handle location errors - not critical for functionality
          // User can still search without location
        },
        {
          enableHighAccuracy: false, // Bruk ikke høy nøyaktighet for å unngå for mange oppdateringer
          timeout: 10000,
          maximumAge: 300000, // Cache lokasjon i 5 minutter
        }
      )
    }
  }, [])

  // Debounced søk når filters eller userLocation endres
  useEffect(() => {
    // Rydd opp tidligere timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Hvis dette er første søk, søk umiddelbart (uten filtre for å vise alle plasser)
    // Vent ikke på userLocation - søk med en gang
    if (!hasSearchedRef.current) {
      searchParkingSpots()
      return
    }

    // Ellers, debounce søket med 800ms (økt fra 500ms for å unngå for mange requests)
    // Dette gir tidligere søk tid til å fullføre
    searchTimeoutRef.current = setTimeout(() => {
      searchParkingSpots()
    }, 800)

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [userLocation, filters, searchParkingSpots])

  // Hent brukerens lokasjon når komponenten mountes
  useEffect(() => {
    if (session && session.user.userType === "LEIETAKER") {
      getCurrentLocation()
    }
  }, [session, getCurrentLocation])

  // Cleanup ved unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchParkingSpots()
  }

  if (!session || session.user.userType !== "LEIETAKER") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ingen tilgang</h1>
          <p className="text-gray-600 mb-4">Kun leietakere kan søke etter parkeringsplasser</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Tilbake til dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navigation />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Søk etter parkering</h1>
          <p className="text-lg text-gray-600">Finn parkeringsplasser basert på lokasjon, tid og pris</p>
        </div>

        {/* Filter form */}
        <form onSubmit={handleSearch} className="bg-white shadow-lg rounded-xl p-6 mb-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Startdato
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starttid
                </label>
                <input
                  type="time"
                  value={filters.startTime}
                  onChange={(e) => handleFilterChange("startTime", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sluttdato
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sluttid
                </label>
                <input
                  type="time"
                  value={filters.endTime}
                  onChange={(e) => handleFilterChange("endTime", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maks pris (NOK/time)
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="F.eks. 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Alle typer</option>
                  <option value="UTENDORS">Utendørs</option>
                  <option value="INNENDORS">Innendørs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maks avstand (km)
                </label>
                <input
                  type="number"
                  value={filters.maxDistance}
                  onChange={(e) => handleFilterChange("maxDistance", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  min="1"
                  max="50"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 disabled:opacity-50 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Søker...
                    </span>
                  ) : (
                    "Søk"
                  )}
                </button>
              </div>
            </div>
        </form>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Map and list view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100" style={{ height: "600px" }}>
              <MapComponent
                parkingSpots={parkingSpots}
                userLocation={userLocation}
                onMarkerClick={(spotId) => {
                  router.push(`/dashboard/parking-spots/${spotId}/view`)
                }}
              />
            </div>

            {/* List */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white shadow-lg rounded-xl p-12 text-center border border-gray-100">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Laster parkeringsplasser...</p>
                </div>
              ) : parkingSpots.length === 0 ? (
                <div className="bg-white shadow-lg rounded-xl p-12 text-center border border-gray-100">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-semibold text-gray-900 mb-2">Ingen parkeringsplasser funnet</p>
                  <p className="text-sm text-gray-600">
                    Prøv å justere søkekriteriene eller utvid søkeområdet.
                  </p>
                </div>
              ) : (
                parkingSpots.map((spot) => (
                  <Link
                    key={spot.id}
                    href={`/dashboard/parking-spots/${spot.id}/view`}
                    className="block bg-white shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-all border border-gray-100 transform hover:scale-[1.02]"
                  >
                    {spot.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={spot.imageUrl}
                        alt={spot.address}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{spot.address}</h3>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            spot.type === "UTENDORS" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {spot.type === "UTENDORS" ? "Utendørs" : "Innendørs/Garasje"}
                          </span>
                        </div>
                      </div>
                      {spot.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {spot.description}
                        </p>
                      )}
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                            {spot.pricePerHour} NOK/time
                          </p>
                        </div>
                        <span className="text-sm text-gray-600">Av {spot.user.name}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
        </div>
      </main>
    </div>
  )
}

