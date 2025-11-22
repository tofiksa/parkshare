"use client"

import { useEffect, useState, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import PaymentForm from "@/components/PaymentForm"
import { TERMS_VERSION, TERMS_LAST_UPDATED, getTermsSummary } from "@/lib/terms"

interface ParkingSpot {
  id: string
  address: string
  type: "UTENDORS" | "INNENDORS"
  pricePerHour: number
}

function NewBookingPageContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [parkingSpot, setParkingSpot] = useState<ParkingSpot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const spotId = searchParams.get("spotId")
  const startTime = searchParams.get("startTime")
  const endTime = searchParams.get("endTime")
  const totalPrice = searchParams.get("totalPrice")

  useEffect(() => {
    if (spotId) {
      fetchParkingSpot()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId])

  const fetchParkingSpot = async () => {
    try {
      const response = await fetch(`/api/parking-spots/${spotId}`)
      if (!response.ok) {
        throw new Error("Kunne ikke hente parkeringsplass")
      }
      const data = await response.json()
      setParkingSpot(data)
    } catch (err) {
      setError("Kunne ikke laste parkeringsplass")
      console.error(err)
    }
  }

  const handleCreateBooking = async () => {
    if (!termsAccepted) {
      setError("Du må godkjenne avtalevilkårene")
      return
    }

    if (!startTime || !endTime || !spotId) {
      setError("Manglende bookinginformasjon")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parkingSpotId: spotId,
          startTime,
          endTime,
          termsAccepted,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Kunne ikke opprette booking")
        return
      }

      // Sett booking ID for betaling
      setBookingId(data.id)
    } catch (err) {
      setError("Noe gikk galt ved opprettelse av booking")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true)
    // Vent litt før redirect for å gi webhook tid til å prosessere
    setTimeout(() => {
      router.push(`/dashboard/bookings/${bookingId}`)
    }, 2000)
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

  if (!startTime || !endTime || !totalPrice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Manglende bookinginformasjon</p>
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
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Bekreft booking</h1>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            {parkingSpot && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Parkeringsplass</h2>
                <p className="text-gray-900">{parkingSpot.address}</p>
                <p className="text-sm text-gray-600">
                  {parkingSpot.type === "UTENDORS" ? "Utendørs" : "Innendørs/Garasje"}
                </p>
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold mb-2">Periode</h2>
              <p className="text-gray-900">
                {new Date(startTime).toLocaleDateString("no-NO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                {new Date(startTime).toLocaleTimeString("no-NO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {new Date(endTime).toLocaleDateString("no-NO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                {new Date(endTime).toLocaleTimeString("no-NO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Pris</h2>
              <p className="text-3xl font-bold text-blue-600">
                {parseFloat(totalPrice).toFixed(2)} NOK
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Avtalevilkår</h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-4 max-h-64 overflow-y-auto border border-gray-200">
                <div className="text-xs text-gray-500 mb-3">
                  Versjon {TERMS_VERSION} - Sist oppdatert: {TERMS_LAST_UPDATED}
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {getTermsSummary()}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Les fullstendige avtalevilkår →
                  </Link>
                </div>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  Jeg godtar avtalevilkårene og bekrefter at jeg har lest og forstått dem.
                </label>
              </div>
            </div>

            {!bookingId ? (
              <div className="flex gap-4">
                <button
                  onClick={handleCreateBooking}
                  disabled={loading || !termsAccepted}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Oppretter booking..." : "Bekreft og fortsett til betaling"}
                </button>
                <Link
                  href="/dashboard/search"
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Avbryt
                </Link>
              </div>
            ) : paymentSuccess ? (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800 text-center">
                  ✅ Betaling vellykket! Du blir omdirigert...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-t pt-6">
                  <h2 className="text-xl font-semibold mb-4">Betalingsinformasjon</h2>
                  <PaymentForm
                    bookingId={bookingId}
                    amount={parseFloat(totalPrice)}
                    onSuccess={handlePaymentSuccess}
                    onError={(error) => setError(error)}
                  />
                </div>
                <Link
                  href="/dashboard/search"
                  className="block text-center px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Avbryt booking
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Laster...</p>
      </div>
    }>
      <NewBookingPageContent />
    </Suspense>
  )
}

