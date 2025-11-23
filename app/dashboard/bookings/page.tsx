"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Navigation from "@/components/Navigation"

interface Booking {
  id: string
  startTime: string
  endTime: string | null
  totalPrice: number | null
  status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "STARTED"
  bookingType?: "ADVANCE" | "ON_DEMAND"
  parkingSpot: {
    id: string
    address: string
    type: "UTENDORS" | "INNENDORS"
  }
  user: {
    name: string
    email: string
    phone?: string
  }
  createdAt: string
}

export default function BookingsPage() {
  const { data: session } = useSession()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "past">("all")

  useEffect(() => {
    if (session) {
      fetchBookings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filter])

  const fetchBookings = async () => {
    try {
      const userType = session?.user.userType === "UTLEIER" ? "UTLEIER" : "LEIETAKER"
      const response = await fetch(`/api/bookings?userType=${userType}`)
      if (!response.ok) {
        throw new Error("Kunne ikke hente bookinger")
      }
      const data = await response.json()
      setBookings(data)
    } catch (err) {
      setError("Kunne ikke laste bookinger")
      console.error(err)
    } finally {
      setLoading(false)
    }
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

  const filteredBookings = bookings.filter((booking) => {
    const now = new Date()
    const startTime = new Date(booking.startTime)
    const endTime = booking.endTime ? new Date(booking.endTime) : null

    switch (filter) {
      case "active":
        return booking.status === "ACTIVE" || booking.status === "CONFIRMED" || booking.status === "STARTED"
      case "upcoming":
        return (startTime > now && booking.status !== "CANCELLED") || booking.status === "STARTED"
      case "past":
        return (endTime && endTime < now) || booking.status === "COMPLETED" || booking.status === "CANCELLED"
      default:
        return true
    }
  })

  const isUtleier = session?.user.userType === "UTLEIER"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navigation />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Mine bookinger
          </h1>
          <p className="text-lg text-gray-600">
            {isUtleier 
              ? "Oversikt over alle bookinger av dine parkeringsplasser"
              : "Oversikt over alle dine bookinger"}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "active"
                  ? "bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              Aktive
            </button>
            <button
              onClick={() => setFilter("upcoming")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "upcoming"
                  ? "bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              Kommende
            </button>
            <button
              onClick={() => setFilter("past")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === "past"
                  ? "bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              Tidligere
            </button>
        </div>

        {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
        )}

        {loading ? (
            <div className="bg-white shadow-lg rounded-xl p-12 text-center border border-gray-100">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Laster bookinger...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white shadow-lg rounded-xl p-12 text-center border border-gray-100">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-semibold text-gray-900 mb-2">Ingen bookinger funnet</p>
              <p className="text-sm text-gray-600">Prøv å endre filteret for å se flere resultater.</p>
            </div>
          ) : (
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {isUtleier ? "Leietaker" : "Parkeringsplass"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Periode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Pris
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Handlinger
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {isUtleier ? booking.user.name : booking.parkingSpot.address}
                          </div>
                          <div className="text-sm text-gray-600">
                            {isUtleier ? booking.user.email : booking.parkingSpot.type === "UTENDORS" ? "Utendørs" : "Innendørs"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(booking.startTime).toLocaleDateString("no-NO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(booking.startTime).toLocaleTimeString("no-NO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {booking.endTime 
                            ? new Date(booking.endTime).toLocaleTimeString("no-NO", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Pågår"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.totalPrice 
                            ? `${booking.totalPrice.toFixed(2)} NOK`
                            : booking.status === "STARTED" 
                              ? "Beregnes ved stopp"
                              : "Ikke satt"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {getStatusText(booking.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/dashboard/bookings/${booking.id}`}
                          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                        >
                          Se detaljer
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}
      </main>
    </div>
  )
}

