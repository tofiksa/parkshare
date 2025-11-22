"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ParkingSpot {
  id: string
  type: "UTENDORS" | "INNENDORS"
  address: string
  latitude: number | null
  longitude: number | null
  imageUrl: string | null
  pricePerHour: number
  description: string | null
  isActive: boolean
  createdAt: string
}

export default function ParkingSpotsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (session) {
      fetchParkingSpots()
    }
  }, [session])

  const fetchParkingSpots = async () => {
    try {
      const response = await fetch("/api/parking-spots")
      if (!response.ok) {
        throw new Error("Kunne ikke hente parkeringsplasser")
      }
      const data = await response.json()
      setParkingSpots(data)
    } catch (err) {
      setError("Kunne ikke laste parkeringsplasser")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne parkeringsplassen?")) {
      return
    }

    try {
      const response = await fetch(`/api/parking-spots/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Kunne ikke slette parkeringsplass")
        return
      }

      // Oppdater listen
      setParkingSpots(parkingSpots.filter((spot) => spot.id !== id))
    } catch (err) {
      alert("Noe gikk galt ved sletting")
      console.error(err)
    }
  }

  if (!session || session.user.userType !== "UTLEIER") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ingen tilgang</h1>
          <p className="text-gray-600 mb-4">Kun utleiere kan se parkeringsplasser</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Mine parkeringsplasser</h1>
            <Link
              href="/dashboard/parking-spots/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Legg til parkeringsplass
            </Link>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Laster parkeringsplasser...</p>
            </div>
          ) : parkingSpots.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-600 mb-4">Du har ingen parkeringsplasser ennå.</p>
              <Link
                href="/dashboard/parking-spots/new"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Legg til din første parkeringsplass
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parkingSpots.map((spot) => (
                <div key={spot.id} className="bg-white shadow rounded-lg overflow-hidden">
                  {spot.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={spot.imageUrl}
                      alt={spot.address}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{spot.address}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          spot.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {spot.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {spot.type === "UTENDORS" ? "Utendørs" : "Innendørs/Garasje"}
                    </p>
                    {spot.description && (
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                        {spot.description}
                      </p>
                    )}
                    <p className="text-lg font-bold text-blue-600 mb-4">
                      {spot.pricePerHour} NOK/time
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/parking-spots/${spot.id}`}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 text-center"
                      >
                        Se detaljer
                      </Link>
                      <button
                        onClick={() => handleDelete(spot.id)}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Slett
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

