"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Navigation from "@/components/Navigation"
import ParkingTimer from "@/components/ParkingTimer"

interface ActiveBooking {
  id: string
  status: string
  actualStartTime: string
  durationMinutes: number
  estimatedPrice: number
  parkingSpot: {
    id: string
    zoneNumber: string | null
    zoneName: string | null
    address: string
    pricePerMinute: number
    pricePerHour: number
  }
  vehiclePlate: string | null
}

export default function ActiveParkingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<ActiveBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")

  useEffect(() => {
    fetchActiveBookings()
    const interval = setInterval(fetchActiveBookings, 1000) // Oppdater hvert sekund

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchActiveBookings = async () => {
    try {
      const response = await fetch("/api/bookings/active")
      
      if (response.status === 404 || response.status === 200) {
        const data = await response.json()
        
        if (!data || (Array.isArray(data) && data.length === 0)) {
          // Ingen aktive bookinger, redirect til kart
          router.push("/dashboard/parking/map")
          return
        }
        
        setBookings(Array.isArray(data) ? data : [data])
      }
    } catch (err) {
      console.error("Error fetching active bookings:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async (bookingId: string) => {
    if (stoppingIds.has(bookingId)) return

    if (!confirm("Er du sikker på at du vil stoppe parkeringen?")) {
      return
    }

    setStoppingIds(prev => new Set(prev).add(bookingId))
    setError("")

    try {
      const response = await fetch(`/api/bookings/${bookingId}/stop`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke stoppe parkering")
      }

      // Redirect til sammendrag
      router.push(`/dashboard/parking/summary/${bookingId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke stoppe parkering")
      setStoppingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(bookingId)
        return newSet
      })
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

  if (bookings.length === 0) {
    return null // Redirect håndteres i useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <Navigation />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-block w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aktive parkeringer</h1>
          <p className="text-gray-600">
            {bookings.length === 1 
              ? "Din parkering er aktiv" 
              : `Du har ${bookings.length} aktive parkeringer`}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {bookings.map((booking) => {
            const startTime = new Date(booking.actualStartTime)
            const isStopping = stoppingIds.has(booking.id)

            return (
              <div key={booking.id} className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                {/* Timer */}
                <div className="mb-6">
                  <ParkingTimer startTime={startTime} pricePerMinute={booking.parkingSpot.pricePerMinute} />
                </div>

                {/* Område info */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h2 className="text-sm font-medium text-gray-700 mb-4">Område</h2>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-purple-600">
                      P {booking.parkingSpot.zoneNumber || "N/A"}
                    </span>
                    {booking.parkingSpot.zoneName && (
                      <span className="text-lg font-medium text-gray-900">
                        {booking.parkingSpot.zoneName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{booking.parkingSpot.address}</p>
                  
                  {booking.vehiclePlate && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-700 mb-1">Kjøretøy</p>
                      <p className="text-lg font-semibold text-gray-900">{booking.vehiclePlate}</p>
                    </div>
                  )}
                </div>

                {/* Starttid */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700 mb-1">Starttid</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {startTime.toLocaleString("no-NO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Stop knapp */}
                <button
                  onClick={() => handleStop(booking.id)}
                  disabled={isStopping}
                  className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isStopping ? "Stopper..." : "Stopp parkering"}
                </button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  Parkeringen stoppes når du trykker på &quot;Stopp parkering&quot;
                </p>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

