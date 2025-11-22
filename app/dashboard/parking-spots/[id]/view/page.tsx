"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { calculateTotalPrice } from "@/lib/pricing"

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
    email: string
  }
}

export default function ParkingSpotViewPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [parkingSpot, setParkingSpot] = useState<ParkingSpot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [bookingData, setBookingData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  })
  const [totalPrice, setTotalPrice] = useState<number | null>(null)

  useEffect(() => {
    if (id) {
      fetchParkingSpot()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (bookingData.startDate && bookingData.startTime && bookingData.endDate && bookingData.endTime) {
      const start = new Date(`${bookingData.startDate}T${bookingData.startTime}`)
      const end = new Date(`${bookingData.endDate}T${bookingData.endTime}`)
      
      if (start < end && parkingSpot) {
        const price = calculateTotalPrice(parkingSpot.pricePerHour, start, end)
        setTotalPrice(price)
      } else {
        setTotalPrice(null)
      }
    } else {
      setTotalPrice(null)
    }
  }, [bookingData, parkingSpot])

  const fetchParkingSpot = async () => {
    try {
      const response = await fetch(`/api/parking-spots/${id}`)
      if (!response.ok) {
        throw new Error("Kunne ikke hente parkeringsplass")
      }
      const data = await response.json()
      setParkingSpot(data)
    } catch (err) {
      setError("Kunne ikke laste parkeringsplass")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBook = () => {
    if (!parkingSpot || !totalPrice) return

    const start = new Date(`${bookingData.startDate}T${bookingData.startTime}`)
    const end = new Date(`${bookingData.endDate}T${bookingData.endTime}`)

    // Navigate to booking page with data
    router.push(
      `/dashboard/bookings/new?spotId=${id}&startTime=${start.toISOString()}&endTime=${end.toISOString()}&totalPrice=${totalPrice}`
    )
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Laster parkeringsplass...</p>
      </div>
    )
  }

  if (error || !parkingSpot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Parkeringsplass ikke funnet"}</p>
          <Link href="/dashboard/search" className="text-blue-600 hover:underline">
            Tilbake til søk
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                Parkshare
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/search"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Tilbake til søk
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {parkingSpot.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={parkingSpot.imageUrl}
                alt={parkingSpot.address}
                className="w-full h-64 object-cover"
              />
            )}

            <div className="p-6">
              <h1 className="text-3xl font-bold mb-2">{parkingSpot.address}</h1>
              <p className="text-gray-600 mb-4">
                {parkingSpot.type === "UTENDORS" ? "Utendørs" : "Innendørs/Garasje"} • Av {parkingSpot.user.name}
              </p>

              {parkingSpot.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Beskrivelse</h2>
                  <p className="text-gray-700">{parkingSpot.description}</p>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Pris</h2>
                <p className="text-3xl font-bold text-blue-600">
                  {parkingSpot.pricePerHour} NOK/time
                </p>
              </div>

              {parkingSpot.latitude && parkingSpot.longitude && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Lokasjon</h2>
                  <p className="text-sm text-gray-600">
                    GPS: {parkingSpot.latitude.toFixed(6)}, {parkingSpot.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {/* Booking form */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold mb-4">Book parkering</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Startdato *
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingData.startDate}
                      onChange={(e) => setBookingData({ ...bookingData, startDate: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Starttid *
                    </label>
                    <input
                      type="time"
                      required
                      value={bookingData.startTime}
                      onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sluttdato *
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingData.endDate}
                      onChange={(e) => setBookingData({ ...bookingData, endDate: e.target.value })}
                      min={bookingData.startDate || new Date().toISOString().split("T")[0]}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sluttid *
                    </label>
                    <input
                      type="time"
                      required
                      value={bookingData.endTime}
                      onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>

                {totalPrice !== null && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Totalpris:</p>
                    <p className="text-2xl font-bold text-blue-600">{totalPrice.toFixed(2)} NOK</p>
                  </div>
                )}

                <button
                  onClick={handleBook}
                  disabled={!totalPrice || totalPrice <= 0}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fortsett til booking
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

