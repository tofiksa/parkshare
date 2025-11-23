"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Navigation from "@/components/Navigation"

interface Summary {
  id: string
  parkingSpot: {
    zoneNumber: string | null
    zoneName: string | null
    operator: string | null
  }
  vehicle: {
    plateNumber: string
  }
  startTime: string
  endTime: string | null
  durationMinutes: number
  durationSeconds: number
  pricing: {
    parkingPrice: number
    serviceFee: number
    total: number
    vatIncluded: boolean
  }
  payment: {
    status: string
    method: string
  } | null
}

export default function ParkingSummaryPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const bookingId = params.id as string

  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (bookingId) {
      fetchSummary()
    }
  }, [bookingId])

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/summary`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Ukjent feil" }))
        throw new Error(errorData.error || "Kunne ikke hente sammendrag")
      }

      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke laste sammendrag")
    } finally {
      setLoading(false)
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
            <p className="text-gray-600">Laster sammendrag...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navigation />
        <main className="max-w-2xl mx-auto py-16 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Kunne ikke laste sammendrag</h1>
            <p className="text-gray-600 mb-4">{error || "Ukjent feil"}</p>
            <Link href="/dashboard/bookings" className="text-blue-600 hover:underline">
              Se alle bookinger
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const startTime = new Date(summary.startTime)
  const endTime = summary.endTime ? new Date(summary.endTime) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <Navigation />
      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-block w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Parkering fullført</h1>
            <p className="text-gray-600">Takk for at du bruker Parkshare</p>
          </div>

          {/* Område */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Område</h2>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-purple-600">
                P {summary.parkingSpot.zoneNumber || "N/A"}
              </span>
              {summary.parkingSpot.zoneName && (
                <span className="text-lg font-medium text-gray-900">
                  {summary.parkingSpot.zoneName}
                </span>
              )}
            </div>
            {summary.parkingSpot.operator && (
              <p className="text-sm text-gray-600">{summary.parkingSpot.operator}</p>
            )}
          </div>

          {/* Kjøretøy */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Kjøretøy</h2>
            <p className="text-lg font-semibold text-gray-900">{summary.vehicle.plateNumber}</p>
          </div>

          {/* Varighet */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Varighet</h2>
            <p className="text-2xl font-bold text-blue-600">
              {summary.durationMinutes} minutter {summary.durationSeconds} sekunder
            </p>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Start:</span>
                <span>{startTime.toLocaleString("no-NO")}</span>
              </div>
              {endTime && (
                <div className="flex justify-between">
                  <span>Slutt:</span>
                  <span>{endTime.toLocaleString("no-NO")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pris */}
          <div className="bg-green-50 rounded-lg p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Pris</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-700">
                <span>Parkering:</span>
                <span>{summary.pricing.parkingPrice.toFixed(2)} NOK</span>
              </div>
              {summary.pricing.serviceFee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Servicegebyr:</span>
                  <span>{summary.pricing.serviceFee.toFixed(2)} NOK</span>
                </div>
              )}
              <div className="border-t border-green-200 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total:</span>
                  <span>{summary.pricing.total.toFixed(2)} NOK</span>
                </div>
              </div>
            </div>
            {summary.pricing.vatIncluded && (
              <p className="text-xs text-gray-600">Inkl. mva</p>
            )}
          </div>

          {/* Betalingsstatus */}
          {summary.payment && (
            <div className="bg-yellow-50 rounded-lg p-6 mb-6">
              <h2 className="text-sm font-medium text-gray-700 mb-2">Betalingsstatus</h2>
              <p className="text-gray-900">
                {summary.payment.status === "COMPLETED" ? "Betalt" : "Venter på betaling"}
              </p>
              <p className="text-sm text-gray-600 mt-1">Metode: {summary.payment.method}</p>
            </div>
          )}

          {/* Handlingsknapper */}
          <div className="space-y-3">
            <Link
              href="/dashboard/bookings"
              className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold text-center shadow-md hover:shadow-lg"
            >
              Se alle bookinger
            </Link>
            <Link
              href="/dashboard/parking/map"
              className="block w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-all font-semibold text-center"
            >
              Start ny parkering
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

