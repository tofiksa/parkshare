"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

interface RevenueData {
  totalRevenue: number
  totalBookings: number
  revenueBySpot: Array<{
    spotId: string
    address: string
    revenue: number
    bookings: number
  }>
  period: string
}

export default function RevenuePage() {
  const { data: session } = useSession()
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [period, setPeriod] = useState<"all" | "month" | "year">("all")

  useEffect(() => {
    if (session && session.user.userType === "UTLEIER") {
      fetchRevenue()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, period])

  const fetchRevenue = async () => {
    try {
      const response = await fetch(`/api/revenue?period=${period}`)
      if (!response.ok) {
        throw new Error("Kunne ikke hente inntekter")
      }
      const data = await response.json()
      setRevenueData(data)
    } catch (err) {
      setError("Kunne ikke laste inntekter")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!session || session.user.userType !== "UTLEIER") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ingen tilgang</h1>
          <p className="text-gray-600 mb-4">Kun utleiere kan se inntekter</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Tilbake til dashboard
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
              <span className="text-sm text-gray-700">{session.user.email}</span>
              <Link
                href="/api/auth/signout"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Logg ut
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Inntekter</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod("all")}
                className={`px-4 py-2 rounded-lg ${
                  period === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`px-4 py-2 rounded-lg ${
                  period === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Denne måneden
              </button>
              <button
                onClick={() => setPeriod("year")}
                className={`px-4 py-2 rounded-lg ${
                  period === "year"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Dette året
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Laster inntekter...</p>
            </div>
          ) : revenueData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-sm font-medium text-gray-700 mb-2">Total inntekt</h2>
                  <p className="text-3xl font-bold text-green-600">
                    {revenueData.totalRevenue.toFixed(2)} NOK
                  </p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-sm font-medium text-gray-700 mb-2">Antall bookinger</h2>
                  <p className="text-3xl font-bold text-blue-600">
                    {revenueData.totalBookings}
                  </p>
                </div>
              </div>

              {revenueData.revenueBySpot.length > 0 && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Inntekt per parkeringsplass
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Parkeringsplass
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Antall bookinger
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Total inntekt
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {revenueData.revenueBySpot.map((spot) => (
                          <tr key={spot.spotId}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {spot.address}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{spot.bookings}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-green-600">
                                {spot.revenue.toFixed(2)} NOK
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {revenueData.totalBookings === 0 && (
                <div className="bg-white shadow rounded-lg p-12 text-center">
                  <p className="text-gray-600">Ingen inntekter ennå.</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Når du får bookinger, vil de vises her.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

