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
  zoneNumber: string | null
  zoneName: string | null
  address: string
  latitude: number | null
  longitude: number | null
  pricePerHour: number
  pricePerMinute: number
  operator: string | null
  type: "UTENDORS" | "INNENDORS"
  distance?: number // Avstand i km
  // Rektangel-koordinater (for bakoverkompatibilitet)
  rectNorthLat?: number | null
  rectSouthLat?: number | null
  rectEastLng?: number | null
  rectWestLng?: number | null
  rectWidthMeters?: number | null
  rectHeightMeters?: number | null
  // Polygon-koordinater for roterte rektangler
  rectCorner1Lat?: number | null
  rectCorner1Lng?: number | null
  rectCorner2Lat?: number | null
  rectCorner2Lng?: number | null
  rectCorner3Lat?: number | null
  rectCorner3Lng?: number | null
  rectCorner4Lat?: number | null
  rectCorner4Lng?: number | null
}

export default function ParkingMapPage() {
  
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  
  console.log("🟡 Component state - loading:", loading, "parkingSpots:", parkingSpots.length, "error:", error, "sessionStatus:", sessionStatus)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null) // Ref for å lese nyeste userLocation uten re-render
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const allParkingSpotsRef = useRef<ParkingSpot[]>([]) // Ref for å holde ALLE parkeringsplasser fra API
  const hasSearchedRef = useRef(false) // Track om vi har søkt
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null)
  const mapBoundsRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null)
  const spotListRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({}) // Refs for liste-elementer
  const hasReceivedInitialDataRef = useRef(false) // Track om vi har mottatt initial data
  const hasReceivedInitialBoundsRef = useRef(false) // Track om vi har mottatt initial bounds
  const isFetchingRef = useRef(false) // Track om vi allerede fetcher data

  // Oppdater refs når state endres
  useEffect(() => {
    mapBoundsRef.current = mapBounds
  }, [mapBounds])
  
  useEffect(() => {
    userLocationRef.current = userLocation
  }, [userLocation])

  // Filtrer parkeringsplasser basert på kartets bounds
  const filterSpotsByBounds = useCallback((spots: ParkingSpot[], bounds: { north: number; south: number; east: number; west: number }) => {
    return spots.filter(spot => {
      if (!spot.latitude || !spot.longitude) return false
      
      // Sjekk om spot er innenfor bounds
      return (
        spot.latitude >= bounds.south &&
        spot.latitude <= bounds.north &&
        spot.longitude >= bounds.west &&
        spot.longitude <= bounds.east
      )
    })
  }, [])

  const fetchParkingSpots = useCallback(async () => {
    // Hvis ingen userLocation, bruk Oslo sentrum som fallback
    const location = userLocation || { lat: 59.9139, lng: 10.7522 } // Oslo sentrum

    console.log("🟢 === fetchParkingSpots called ===")
    console.log("🟢 Location:", location)
    console.log("🟢 User location from state:", userLocation)

    // IKKE kanseller forrige request hvis vi allerede har data
    // Dette forhindrer at data forsvinner når nye søk trigges
    const previousController = abortControllerRef.current
    
    // Kun kanseller hvis forrige request ikke har returnert data ennå
    // OG vi ikke allerede har data
    if (previousController && !previousController.signal.aborted && allParkingSpotsRef.current.length === 0) {
      console.log("🟡 Aborting previous request (no data yet)")
      previousController.abort()
    }
    
    // Hvis vi allerede har data, ikke gjør ny request
    if (allParkingSpotsRef.current.length > 0 && hasReceivedInitialDataRef.current) {
      console.log("🟡 Already have data, skipping fetch")
      return
    }
    
    // Hvis vi allerede fetcher, ikke start ny fetch
    if (isFetchingRef.current) {
      console.log("🟡 Already fetching, skipping")
      return
    }
    
    isFetchingRef.current = true
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    console.log("Setting loading to true")
    setLoading(true)
    setError("")

    // Timeout for å unngå at loading forblir true
    const loadingTimeout = setTimeout(() => {
      if (!abortController.signal.aborted) {
        console.warn("Loading timeout reached - setting loading to false")
        setLoading(false)
        setError("Timeout: Kunne ikke laste parkeringsplasser. Prøv å oppdatere siden.")
      }
    }, 10000)

    try {
      console.log("Fetching from:", `/api/parking-spots/map?latitude=${location.lat}&longitude=${location.lng}&radius=1`)
      const response = await fetch(
        `/api/parking-spots/map?latitude=${location.lat}&longitude=${location.lng}&radius=1`,
        { signal: abortController.signal }
      )
      
      console.log("Response status:", response.status, response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Ukjent feil" }))
        console.error("API error:", errorData)
        throw new Error(errorData.error || `Kunne ikke hente parkeringsplasser (${response.status})`)
      }

      const data = await response.json()
      console.log("API response data:", data)
      
      if (!abortController.signal.aborted) {
        clearTimeout(loadingTimeout)
        isFetchingRef.current = false
        const spots = Array.isArray(data.parkingSpots) ? data.parkingSpots : []
        
        // Debug logging
        console.log("Fetched parking spots:", spots.length, "spots:", spots)
        
        // Debug: sjekk rektangel-data i første spot
        if (spots.length > 0) {
          const firstSpot = spots[0]
          console.log("🔍 Frontend - First spot rect data:", {
            id: firstSpot.id,
            address: firstSpot.address,
            hasRectCoords: !!(firstSpot.rectNorthLat && firstSpot.rectSouthLat && firstSpot.rectEastLng && firstSpot.rectWestLng),
            hasRectSize: !!(firstSpot.rectWidthMeters && firstSpot.rectHeightMeters),
            rectNorthLat: firstSpot.rectNorthLat,
            rectSouthLat: firstSpot.rectSouthLat,
            rectEastLng: firstSpot.rectEastLng,
            rectWestLng: firstSpot.rectWestLng,
            rectWidthMeters: firstSpot.rectWidthMeters,
            rectHeightMeters: firstSpot.rectHeightMeters,
          })
        }
        
        // Lagre alle parkeringsplasser i ref (alle fra API, ikke filtrert)
        allParkingSpotsRef.current = spots
        hasReceivedInitialDataRef.current = true
        
        // Filtrer basert på kartets bounds hvis de er satt OG vi har mottatt initial bounds
        // Ved første innlasting, vis ALLE spots uansett bounds (for å unngå at feil bounds filtrerer bort alt)
        const currentBounds = mapBoundsRef.current
        
        // Kun filtrer hvis vi har mottatt initial bounds (dvs. brukeren har interagert med kartet)
        // Dette sikrer at vi viser alle spots ved første innlasting
        if (currentBounds && hasReceivedInitialBoundsRef.current) {
          // Bounds er satt OG vi har mottatt initial bounds - filtrer spots
          const filteredSpots = filterSpotsByBounds(spots, currentBounds)
          console.log("🟦 Filtering spots by bounds:", filteredSpots.length, "out of", spots.length, "bounds:", currentBounds)
          setParkingSpots(filteredSpots)
        } else {
          // Ingen bounds ennå ELLER vi har ikke mottatt initial bounds - vis alle spots
          console.log("🟦 Showing all spots (no bounds yet or initial bounds not received):", spots.length)
          setParkingSpots(spots)
        }
        
        setError("") // Clear error hvis vi fikk data
        setLoading(false)
        
        if (spots.length === 0) {
          console.warn("No parking spots returned from API")
        }
      }
    } catch (err) {
      clearTimeout(loadingTimeout)
      isFetchingRef.current = false
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Request was aborted")
        return
      }
      
      // Error is handled and displayed to user via setError
      
      const errorMessage = err instanceof Error ? err.message : "Kunne ikke laste parkeringsplasser"
      setError(errorMessage)
      setLoading(false)
      
      // IKKE tøm parkeringsplasser ved feil - behold eksisterende data
      // Kun oppdater hvis vi ikke har noen data fra før
      if (allParkingSpotsRef.current.length === 0) {
        setParkingSpots([])
      }
      
      // Ikke prøv igjen automatisk - la brukeren trykke "Prøv igjen"
    }
  }, [userLocation, filterSpotsByBounds]) // Inkluder filterSpotsByBounds

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
          setError("Kunne ikke hente din lokasjon. Vennligst aktiver GPS.")
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        }
      )
    } else {
      setError("Nettleseren din støtter ikke geolokasjon")
    }
  }, [])

  // Hent parkeringsplasser når session er klar (kun en gang)
  useEffect(() => {
    console.log("🔵 useEffect triggered")
    console.log("🔵 Session status:", sessionStatus)
    console.log("🔵 Session:", session ? "exists" : "null")
    console.log("🔵 User type:", session?.user?.userType)
    console.log("🔵 Has searched:", hasSearchedRef.current)
    console.log("🔵 Is fetching:", isFetchingRef.current)
    console.log("🔵 Has received initial data:", hasReceivedInitialDataRef.current)
    console.log("🔵 All spots count:", allParkingSpotsRef.current.length)
    console.log("🔵 Parking spots state count:", parkingSpots.length)
    console.log("🔵 User location:", userLocation)
    
    // Vent til session er lastet (ikke "loading")
    if (sessionStatus === "loading") {
      console.log("⏳ Waiting for session to load...")
      return
    }
    
    // Hvis session er lastet men ikke autentisert, eller ikke leietaker
    if (sessionStatus === "unauthenticated" || !session) {
      console.log("🔴 No session or unauthenticated")
      setLoading(false)
      return
    }
    
    // VIKTIG: Sjekk om vi faktisk har data i BÅDE ref OG state
    // Dette sikrer at vi alltid henter data hvis vi ikke har det, selv om refs er satt
    const hasDataInRef = hasReceivedInitialDataRef.current && allParkingSpotsRef.current.length > 0
    const hasDataInState = parkingSpots.length > 0
    
    if (hasDataInRef && hasDataInState) {
      console.log("🟡 Already have data in both ref and state, skipping fetch")
      setLoading(false)
      return
    }
    
    // Hvis vi har data i ref men ikke i state, oppdater state
    if (hasDataInRef && !hasDataInState) {
      console.log("🟡 Have data in ref but not in state - updating state")
      const currentBounds = mapBoundsRef.current
      if (currentBounds && hasReceivedInitialBoundsRef.current) {
        const filteredSpots = filterSpotsByBounds(allParkingSpotsRef.current, currentBounds)
        setParkingSpots(filteredSpots)
      } else {
        setParkingSpots(allParkingSpotsRef.current)
      }
      setLoading(false)
      return
    }
    
    // Hvis vi allerede fetcher, ikke start ny fetch
    // Men hvis vi har ventet lenge uten data, kan det være at forrige fetch feilet
    if (isFetchingRef.current) {
      console.log("🟡 Already fetching, skipping")
      // Hvis vi allerede fetcher, sjekk om vi har data - hvis ja, sett loading til false
      if (hasDataInRef || hasDataInState) {
        setLoading(false)
      }
      return
    }
    
    // Hvis vi allerede har søkt MEN ikke har data, prøv igjen
    // Dette håndterer tilfeller hvor forrige fetch feilet eller ble avbrutt
    if (hasSearchedRef.current) {
      // Hvis vi har søkt men ikke har data, kan det være at forrige fetch feilet
      // I så fall, prøv igjen (men kun hvis vi ikke allerede fetcher)
      if (!hasDataInRef && !hasDataInState) {
        console.log("🟡 Already searched but no data in ref or state - retrying fetch")
        // Reset flagg for å tillate ny fetch
        hasSearchedRef.current = false
        // Fall through til fetch-logikken nedenfor
      } else {
        console.log("🟡 Already searched and have data, skipping")
        setLoading(false)
        return
      }
    }
    
    if (session && session.user.userType === "LEIETAKER") {
      // Sett flagg med en gang for å unngå flere kall
      hasSearchedRef.current = true
      isFetchingRef.current = true
      
      console.log("🟢 useEffect: Fetching parking spots (first time)")
      
      // Kall API direkte i stedet for via fetchParkingSpots
      // Bruk userLocationRef for å få nyeste verdi uten å re-triggere effect
      const location = userLocationRef.current || { lat: 59.9139, lng: 10.7522 } // Oslo sentrum
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      
      setLoading(true)
      setError("")
      
      // Timeout for å unngå at loading forblir true
      const loadingTimeout = setTimeout(() => {
        if (!abortController.signal.aborted && isFetchingRef.current) {
          console.warn("🟡 Loading timeout reached - setting loading to false")
          isFetchingRef.current = false
          hasSearchedRef.current = false // Reset så vi kan prøve igjen
          setLoading(false)
          setError("Timeout: Kunne ikke laste parkeringsplasser. Prøv å oppdatere siden.")
        }
      }, 10000)
      
      const doFetch = async () => {
        try {
          console.log("🟢 About to call API directly")
          console.log("🟢 Location:", location)
          console.log("🟢 Abort signal aborted:", abortController.signal.aborted)
          
          const response = await fetch(
            `/api/parking-spots/map?latitude=${location.lat}&longitude=${location.lng}&radius=1`,
            { signal: abortController.signal }
          )
          
          console.log("🟢 Response status:", response.status, response.ok)
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Ukjent feil" }))
            throw new Error(errorData.error || `Kunne ikke hente parkeringsplasser (${response.status})`)
          }
          
          const data = await response.json()
          console.log("🟢 API response data:", data)
          
          // Sjekk om request ble avbrutt FØR vi oppdaterer state
          if (abortController.signal.aborted) {
            console.log("🟢 Request was aborted before state update")
            clearTimeout(loadingTimeout)
            isFetchingRef.current = false
            hasSearchedRef.current = false // Reset så vi kan prøve igjen
            return
          }
          
          clearTimeout(loadingTimeout)
          isFetchingRef.current = false
          const spots = Array.isArray(data.parkingSpots) ? data.parkingSpots : []
          
          console.log("🟢 Fetched parking spots:", spots.length)
          
          // VIKTIG: Oppdater data FØR vi setter hasReceivedInitialDataRef
          // Dette sikrer at data er tilgjengelig når vi sjekker i neste render
          allParkingSpotsRef.current = spots
          hasReceivedInitialDataRef.current = true
          
          const currentBounds = mapBoundsRef.current
          
          if (currentBounds && hasReceivedInitialBoundsRef.current) {
            const filteredSpots = filterSpotsByBounds(spots, currentBounds)
            console.log("🟢 Filtering spots by bounds:", filteredSpots.length, "out of", spots.length)
            setParkingSpots(filteredSpots)
          } else {
            console.log("🟢 Showing all spots (no bounds yet):", spots.length)
            setParkingSpots(spots)
          }
          
          setError("")
          setLoading(false)
        } catch (err) {
          clearTimeout(loadingTimeout)
          isFetchingRef.current = false
          hasSearchedRef.current = false // Reset så vi kan prøve igjen ved neste render
          if (err instanceof Error && err.name === "AbortError") {
            console.log("🟢 Request was aborted (in catch)")
            setLoading(false)
            return
          }
          console.error("🟢 Failed to fetch parking spots:", err)
          setError(err instanceof Error ? err.message : "Kunne ikke hente parkeringsplasser")
          setLoading(false)
        }
      }
      
      doFetch()
    } else {
      console.log("🔴 useEffect: Conditions not met", {
        hasSession: !!session,
        isLeietaker: session?.user?.userType === "LEIETAKER",
        hasSearched: hasSearchedRef.current
      })
      setLoading(false)
    }
  }, [session, sessionStatus]) // filterSpotsByBounds er stabil useCallback, trenger ikke være i dependencies

  useEffect(() => {
    if (session && session.user.userType === "LEIETAKER") {
      getCurrentLocation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]) // Kun kjøre når session er klar

  // Cleanup: abort request og reset refs ved unmount
  useEffect(() => {
    return () => {
      console.log("🟡 Component unmounting - cleaning up")
      // Abort request hvis den fortsatt kjører
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        console.log("🟡 Aborting request on unmount")
        abortControllerRef.current.abort()
      }
      // Reset refs ved unmount for å sikre at de er rene ved neste mount
      // Dette sikrer at refs resetter ved client-side navigation hvis komponenten unmountes
      hasSearchedRef.current = false
      isFetchingRef.current = false
      hasReceivedInitialDataRef.current = false
      allParkingSpotsRef.current = []
    }
  }, [])

  const handleMarkerClick = (spotId: string) => {
    const spot = parkingSpots.find((s) => s.id === spotId)
    if (spot) {
      setSelectedSpot(spot)
      // Scroll til valgt element i listen
      setTimeout(() => {
        const element = spotListRefs.current[spotId]
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      }, 100)
    }
  }

  const handleSelectSpot = () => {
    if (selectedSpot) {
      router.push(`/dashboard/parking/confirm?spotId=${selectedSpot.id}`)
    }
  }

  // Håndter bounds-endringer fra kartet
  const handleBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    console.log("🟦 Map bounds changed:", bounds)
    console.log("🟦 Has received initial data:", hasReceivedInitialDataRef.current)
    console.log("🟦 Has received initial bounds:", hasReceivedInitialBoundsRef.current)
    console.log("🟦 All spots count:", allParkingSpotsRef.current.length)
    
    setMapBounds(bounds)
    
    // Marker at vi har mottatt initial bounds (etter første gang)
    if (!hasReceivedInitialBoundsRef.current) {
      hasReceivedInitialBoundsRef.current = true
      console.log("🟦 Initial bounds received")
    }
    
    // Kun filtrer hvis vi har mottatt initial data
    // Men vent med å filtrere til vi har mottatt initial bounds (dvs. ikke ved første bounds-kall)
    if (hasReceivedInitialDataRef.current && allParkingSpotsRef.current.length > 0 && hasReceivedInitialBoundsRef.current) {
      const filtered = filterSpotsByBounds(allParkingSpotsRef.current, bounds)
      console.log("🟦 Filtered spots:", filtered.length, "out of", allParkingSpotsRef.current.length)
      setParkingSpots(filtered)
    } else if (!hasReceivedInitialDataRef.current) {
      // Hvis vi ikke har mottatt initial data ennå, ikke oppdater parkingSpots
      console.log("🟦 Bounds received but waiting for initial data. Current spots:", parkingSpots.length)
    } else if (!hasReceivedInitialBoundsRef.current) {
      // Hvis vi har data men ikke har mottatt initial bounds ennå, vis alle spots
      console.log("🟦 Bounds received but showing all spots until initial bounds received")
      setParkingSpots(allParkingSpotsRef.current)
    }
  }, [filterSpotsByBounds, parkingSpots.length])

  // Oppdater listen når bounds endres (kun hvis vi har mottatt initial data og initial bounds)
  useEffect(() => {
    // Kun filtrer hvis vi har mottatt initial data OG initial bounds
    // Dette forhindrer at bounds som kommer før data eller ved første innlasting filtrerer bort alle spots
    if (mapBounds && hasReceivedInitialDataRef.current && hasReceivedInitialBoundsRef.current && allParkingSpotsRef.current.length > 0) {
      const filtered = filterSpotsByBounds(allParkingSpotsRef.current, mapBounds)
      console.log("🟦 useEffect bounds: Filtered spots:", filtered.length, "out of", allParkingSpotsRef.current.length)
      setParkingSpots(filtered)
    } else if (hasReceivedInitialDataRef.current && allParkingSpotsRef.current.length > 0 && !hasReceivedInitialBoundsRef.current) {
      // Hvis vi har data men ikke initial bounds ennå, vis alle spots
      console.log("🟦 useEffect bounds: Showing all spots (waiting for initial bounds)")
      setParkingSpots(allParkingSpotsRef.current)
    }
  }, [mapBounds, filterSpotsByBounds])

  // Scroll til valgt element når selectedSpot endres
  useEffect(() => {
    if (selectedSpot) {
      setTimeout(() => {
        const element = spotListRefs.current[selectedSpot.id]
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      }, 100)
    }
  }, [selectedSpot])

  // Vis loading mens session lastes
  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Laster...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!session || session.user.userType !== "LEIETAKER") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ingen tilgang</h1>
          <p className="text-gray-600 mb-4">Kun leietakere kan starte parkering</p>
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
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tilbake til dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Velg parkeringsområde</h1>
          <p className="text-lg text-gray-600">Velg området du vil parkere i på kartet</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kart */}
          <div className="lg:col-span-2 bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100" style={{ height: "600px" }}>
            {loading && !userLocation ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Henter din lokasjon...</p>
                </div>
              </div>
            ) : (
              <MapComponent
                parkingSpots={parkingSpots}
                userLocation={userLocation}
                onMarkerClick={handleMarkerClick}
                onBoundsChange={handleBoundsChange}
                selectedSpotId={selectedSpot?.id || null}
              />
            )}
          </div>

          {/* Områdeliste */}
          <div className="space-y-4">
            <div className="bg-white shadow-lg rounded-xl p-4 border border-gray-100">
              <h2 className="text-lg font-semibold mb-2 text-gray-900">Parkeringsplasser</h2>
              <p className="text-xs text-gray-500 mb-4">
                Viser {parkingSpots.length} {parkingSpots.length === 1 ? 'plass' : 'plasser'} synlig på kartet
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Valg av rett område er på eget ansvar
              </p>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                  <p className="text-sm text-gray-600">Laster områder...</p>
                  <p className="text-xs text-gray-400 mt-2">Hvis dette tar for lang tid, sjekk nettleserkonsollen (F12)</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-sm text-red-600 mb-2">{error}</p>
                  <button
                    onClick={() => fetchParkingSpots()}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Prøv igjen
                  </button>
                </div>
              ) : parkingSpots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">Ingen parkeringsplasser synlig</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Zoom ut eller flytt kartet for å se flere plasser
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {parkingSpots.map((spot) => (
                    <button
                      key={spot.id}
                      ref={(el) => {
                        spotListRefs.current[spot.id] = el
                      }}
                      onClick={() => {
                        setSelectedSpot(spot)
                        // Scroll til valgt element
                        setTimeout(() => {
                          const element = spotListRefs.current[spot.id]
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "nearest" })
                          }
                        }, 100)
                      }}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedSpot?.id === spot.id
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-purple-600">
                              P {spot.zoneNumber || "N/A"}
                            </span>
                            {spot.zoneName && (
                              <span className="text-sm font-medium text-gray-900">
                                {spot.zoneName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{spot.address}</p>
                          {spot.operator && (
                            <p className="text-xs text-gray-500">
                              {spot.operator}
                            </p>
                          )}
                          <div className="mt-2 space-y-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {spot.pricePerMinute.toFixed(2)} NOK/min
                            </p>
                            {spot.distance !== undefined && (
                              <p className="text-xs text-gray-500">
                                {spot.distance.toFixed(1)} km unna
                              </p>
                            )}
                          </div>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSpot && (
              <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Valgt område</h3>
                <div className="space-y-2 mb-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Område:</span>
                    <p className="text-gray-900">
                      P {selectedSpot.zoneNumber} - {selectedSpot.zoneName || selectedSpot.address}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Pris:</span>
                    <p className="text-gray-900">
                      {selectedSpot.pricePerMinute.toFixed(2)} NOK per minutt
                    </p>
                  </div>
                  {selectedSpot.operator && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Operatør:</span>
                      <p className="text-gray-900">{selectedSpot.operator}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSelectSpot}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  Fortsett
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

