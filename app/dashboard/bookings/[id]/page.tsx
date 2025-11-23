"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import MessageThread from "@/components/MessageThread"

interface Booking {
  id: string
  startTime: string
  endTime: string | null
  totalPrice: number | null
  status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "STARTED"
  bookingType?: "ADVANCE" | "ON_DEMAND"
  qrCode: string | null
  parkingSpot: {
    id: string
    address: string
    type: "UTENDORS" | "INNENDORS"
    latitude: number | null
    longitude: number | null
    imageUrl: string | null
    qrCode: string | null
  }
  createdAt: string
}

export default function BookingDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (id) {
      fetchBooking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchBooking = async () => {
    try {
      const response = await fetch(`/api/bookings/${id}`)
      if (!response.ok) {
        throw new Error("Kunne ikke hente booking")
      }
      const data = await response.json()
      setBooking(data)
    } catch (err) {
      setError("Kunne ikke laste booking")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const canCancel = () => {
    if (!booking) return false
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") return false

    const startTime = new Date(booking.startTime)
    const now = new Date()
    const minutesUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60)

    return minutesUntilStart > 30
  }

  const handleCancel = async () => {
    if (!confirm("Er du sikker på at du vil avbestille denne bookingen?")) {
      return
    }

    setCancelling(true)
    try {
      const response = await fetch(`/api/bookings/${id}/cancel`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Kunne ikke avbestille booking")
        return
      }

      router.push("/dashboard/bookings")
    } catch (err) {
      alert("Noe gikk galt ved avbestilling")
      console.error(err)
    } finally {
      setCancelling(false)
    }
  }

  if (!session) {
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
        <p className="text-gray-600">Laster booking...</p>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Booking ikke funnet"}</p>
          <Link href="/dashboard/bookings" className="text-blue-600 hover:underline">
            Tilbake til bookinger
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800"
      case "ACTIVE":
        return "bg-green-100 text-green-800"
      case "STARTED":
        return "bg-purple-100 text-purple-800"
      case "COMPLETED":
        return "bg-gray-100 text-gray-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Venter"
      case "CONFIRMED":
        return "Bekreftet"
      case "ACTIVE":
        return "Aktiv"
      case "STARTED":
        return "Pågår"
      case "COMPLETED":
        return "Fullført"
      case "CANCELLED":
        return "Avbestilt"
      default:
        return status
    }
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
                href="/dashboard/bookings"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Tilbake til bookinger
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Booking detaljer</h1>
            <span
              className={`px-3 py-1 text-sm rounded ${getStatusColor(booking.status)}`}
            >
              {getStatusText(booking.status)}
            </span>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            {booking.parkingSpot.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={booking.parkingSpot.imageUrl}
                alt={booking.parkingSpot.address}
                className="w-full h-64 object-cover"
              />
            )}

            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-1">{booking.parkingSpot.address}</h2>
                <p className="text-gray-600">
                  {booking.parkingSpot.type === "UTENDORS" ? "Utendørs" : "Innendørs/Garasje"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Starttid</h3>
                  <p className="text-gray-900">
                    {new Date(booking.startTime).toLocaleDateString("no-NO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-gray-900">
                    {new Date(booking.startTime).toLocaleTimeString("no-NO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Sluttid</h3>
                  {booking.endTime ? (
                    <>
                      <p className="text-gray-900">
                        {new Date(booking.endTime).toLocaleDateString("no-NO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-gray-900">
                        {new Date(booking.endTime).toLocaleTimeString("no-NO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-900">Pågår (ingen sluttid satt)</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Totalpris</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {booking.totalPrice 
                    ? `${booking.totalPrice.toFixed(2)} NOK`
                    : booking.status === "STARTED"
                      ? "Beregnes ved stopp"
                      : "Ikke satt"}
                </p>
              </div>

              {/* Tilgangsinformasjon */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Tilgangsinformasjon</h3>
                {booking.parkingSpot.type === "UTENDORS" ? (
                  <div className="space-y-2">
                    {booking.parkingSpot.latitude && booking.parkingSpot.longitude && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">GPS-koordinater:</p>
                        <p className="text-gray-900">
                          {booking.parkingSpot.latitude.toFixed(6)}, {booking.parkingSpot.longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                    {booking.parkingSpot.imageUrl && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Bilde av parkeringsplassen:</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={booking.parkingSpot.imageUrl}
                          alt="Parkeringsplass"
                          className="max-w-md rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      QR-kode for tilgang (vis ved ankomst):
                    </p>
                    {booking.qrCode ? (
                      <div className="bg-white p-4 rounded-lg border-2 border-gray-300 inline-block">
                        <p className="text-xs text-gray-600 mb-2">QR-kode:</p>
                        <p className="font-mono text-sm">{booking.qrCode}</p>
                        <p className="text-xs text-gray-600 mt-2">
                          QR-kode bilde vil bli generert når booking er bekreftet
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        QR-kode vil bli generert når booking er bekreftet
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Avbestillingsknapp */}
              {canCancel() && (
                <div className="border-t pt-6">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelling ? "Avbestiller..." : "Avbestill booking"}
                  </button>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Du kan avbestille innen 30 minutter før oppstart
                  </p>
                </div>
              )}

              {!canCancel() && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                <div className="border-t pt-6">
                  <p className="text-sm text-gray-600 text-center">
                    Avbestilling er ikke lenger mulig (må være mer enn 30 minutter før oppstart)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Messages section */}
          <div className="mt-6">
            <MessageThread bookingId={id} />
          </div>
        </div>
      </main>
    </div>
  )
}

