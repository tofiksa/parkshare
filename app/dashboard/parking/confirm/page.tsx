"use client"

import { useEffect, useState, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Navigation from "@/components/Navigation"

interface ParkingSpot {
  id: string
  zoneNumber: string | null
  zoneName: string | null
  address: string
  operator: string | null
  pricePerMinute: number
}

function ConfirmParkingPageContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const spotId = searchParams.get("spotId")

  const [parkingSpot, setParkingSpot] = useState<ParkingSpot | null>(null)
  const [vehiclePlate, setVehiclePlate] = useState("")
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState("")
  const [canStart, setCanStart] = useState(false)
  const [gpsVerified, setGpsVerified] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [requireGpsVerification, setRequireGpsVerification] = useState(false) // Valgfri GPS-verifisering

  useEffect(() => {
    if (!spotId) {
      router.push("/dashboard/parking/map")
      return
    }

    // Hent parkeringsplass info
    fetch(`/api/parking-spots/${spotId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setParkingSpot(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setError("Kunne ikke laste parkeringsplass")
        setLoading(false)
      })
  }, [spotId, router])

  useEffect(() => {
    // Hent brukerens lokasjon
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          setError("Kunne ikke hente din lokasjon")
        }
      )
    }
  }, [])

  useEffect(() => {
    if (parkingSpot && vehiclePlate && userLocation) {
      prepareBooking()
    }
  }, [parkingSpot, vehiclePlate, userLocation, requireGpsVerification])

  const prepareBooking = async () => {
    if (!parkingSpot || !vehiclePlate || !userLocation) return

    setPreparing(true)
    setError("")

    try {
      const response = await fetch("/api/bookings/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parkingSpotId: parkingSpot.id,
          vehiclePlate,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          requireGpsVerification, // Send om GPS-verifisering er påkrevd
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke forberede booking")
      }

      setCanStart(data.canStart)
      setGpsVerified(data.gpsVerified)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke forberede booking")
    } finally {
      setPreparing(false)
    }
  }

  const handleStart = async () => {
    if (!parkingSpot || !vehiclePlate || !userLocation) return

    // Hvis GPS-verifisering er aktivert og ikke verifisert, ikke start
    if (requireGpsVerification && !gpsVerified) {
      setError("Du må være nær området for å starte parkering")
      return
    }

    setPreparing(true)
    setError("")

    try {
      const response = await fetch("/api/bookings/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parkingSpotId: parkingSpot.id,
          vehiclePlate,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          requireGpsVerification, // Send om GPS-verifisering er påkrevd
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke starte parkering")
      }

      router.push("/dashboard/parking/active")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke starte parkering")
      setPreparing(false)
    }
  }

  if (!session || session.user.userType !== "LEIETAKER") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ingen tilgang</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Tilbake til dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navigation />
        <main className="max-w-2xl mx-auto py-16 px-4">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Laster...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!parkingSpot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navigation />
        <main className="max-w-2xl mx-auto py-16 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Parkeringsplass ikke funnet</h1>
            <Link href="/dashboard/parking/map" className="text-blue-600 hover:underline">
              Velg et annet område
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navigation />
      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/parking/map"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tilbake til kart
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Bekreft parkering</h1>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Område info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-700 mb-2">Område</h2>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold text-purple-600">
                  P {parkingSpot.zoneNumber || "N/A"}
                </span>
                {parkingSpot.zoneName && (
                  <span className="text-lg font-medium text-gray-900">
                    {parkingSpot.zoneName}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{parkingSpot.address}</p>
              {parkingSpot.operator && (
                <p className="text-xs text-gray-500 mt-1">{parkingSpot.operator}</p>
              )}
            </div>

            {/* Kjøretøy */}
            <div>
              <label htmlFor="vehiclePlate" className="block text-sm font-medium text-gray-700 mb-2">
                Kjøretøyregistreringsnummer *
              </label>
              <input
                id="vehiclePlate"
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="F.eks. EV42193"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={10}
              />
            </div>

            {/* Pris */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-700 mb-2">Pris</h2>
              <p className="text-2xl font-bold text-blue-600">
                {parkingSpot.pricePerMinute.toFixed(2)} NOK per minutt
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Du betaler kun for faktisk parkeringstid
              </p>
            </div>

            {/* GPS-verifisering toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="gpsVerification" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Verifiser at jeg er på riktig sted
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Aktiver for å bekrefte at du er nær parkeringsområdet
                </p>
              </div>
              <input
                id="gpsVerification"
                type="checkbox"
                checked={requireGpsVerification}
                onChange={(e) => setRequireGpsVerification(e.target.checked)}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
            </div>

            {/* GPS status - vis kun hvis verifisering er aktivert */}
            {requireGpsVerification && (
              <>
                {preparing ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm">Verifiserer lokasjon...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {gpsVerified ? (
                      <>
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-green-600">Du er nær nok området</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-orange-600">Du er ikke nær nok området</span>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Start knapp */}
            <button
              onClick={handleStart}
              disabled={!canStart || !vehiclePlate || preparing || (requireGpsVerification && !gpsVerified)}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {preparing ? "Starter..." : "Start parkering"}
            </button>

            <p className="text-xs text-center text-gray-500">
              Ved å starte parkering godtar du at du er ansvarlig for å velge riktig område
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ConfirmParkingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navigation />
        <main className="max-w-2xl mx-auto py-16 px-4">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Laster...</p>
          </div>
        </main>
      </div>
    }>
      <ConfirmParkingPageContent />
    </Suspense>
  )
}

