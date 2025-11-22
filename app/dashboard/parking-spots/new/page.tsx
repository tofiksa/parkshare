"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"

export default function NewParkingSpotPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    type: "UTENDORS" as "UTENDORS" | "INNENDORS",
    address: "",
    latitude: "",
    longitude: "",
    description: "",
    pricePerHour: "",
    imageUrl: "",
  })
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  // Hent prisforslag når type endres
  useEffect(() => {
    if (formData.type) {
      fetchSuggestedPrice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type])

  const fetchSuggestedPrice = async () => {
    try {
      const response = await fetch("/api/parking-spots/suggest-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestedPrice(data.suggestedPrice)
        if (!formData.pricePerHour) {
          setFormData({ ...formData, pricePerHour: data.suggestedPrice.toString() })
        }
      }
    } catch (err) {
      console.error("Error fetching suggested price:", err)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolokasjon støttes ikke av nettleseren")
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        })
        setGettingLocation(false)
        fetchSuggestedPrice()
      },
      (error) => {
        setError("Kunne ikke hente lokasjon: " + error.message)
        setGettingLocation(false)
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validering
    if (!formData.address || formData.address.length < 5) {
      setError("Adresse må være minst 5 tegn")
      return
    }

    if (formData.type === "UTENDORS") {
      if (!formData.latitude || !formData.longitude) {
        setError("GPS-koordinater er påkrevd for utendørs plasser")
        return
      }
    }

    if (!formData.pricePerHour || parseFloat(formData.pricePerHour) <= 0) {
      setError("Pris må være større enn 0")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/parking-spots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: formData.type,
          address: formData.address,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
          description: formData.description || undefined,
          pricePerHour: parseFloat(formData.pricePerHour),
          imageUrl: formData.imageUrl || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Noe gikk galt")
        return
      }

      // Redirect til oversikt
      router.push("/dashboard/parking-spots")
    } catch (err) {
      setError("Noe gikk galt. Prøv igjen.")
    } finally {
      setLoading(false)
    }
  }

  if (!session || session.user.userType !== "UTLEIER") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ingen tilgang</h1>
          <p className="text-gray-600 mb-4">Kun utleiere kan opprette parkeringsplasser</p>
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
              <Link
                href="/dashboard/parking-spots"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Mine parkeringsplasser
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Legg til parkeringsplass
          </h1>

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Type parkeringsplass *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as "UTENDORS" | "INNENDORS",
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="UTENDORS">Utendørs</option>
                <option value="INNENDORS">Innendørs/Garasje</option>
              </select>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Adresse *
              </label>
              <input
                id="address"
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Gateadresse, postnummer, by"
              />
            </div>

            {formData.type === "UTENDORS" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GPS-koordinater *
                  </label>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="mb-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {gettingLocation ? "Henter lokasjon..." : "Bruk min nåværende lokasjon"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                      Breddegrad
                    </label>
                    <input
                      id="latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      placeholder="59.9139"
                    />
                  </div>
                  <div>
                    <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                      Lengdegrad
                    </label>
                    <input
                      id="longitude"
                      name="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      placeholder="10.7522"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="pricePerHour" className="block text-sm font-medium text-gray-700">
                Pris per time (NOK) *
              </label>
              <input
                id="pricePerHour"
                name="pricePerHour"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.pricePerHour}
                onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="30"
              />
              {suggestedPrice && (
                <p className="mt-1 text-sm text-gray-600">
                  Foreslått pris: {suggestedPrice} NOK/time
                </p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Beskrivelse (valgfritt)
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Beskriv parkeringsplassen..."
              />
            </div>

            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                Bilde-URL (valgfritt)
              </label>
              <input
                id="imageUrl"
                name="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
              <p className="mt-1 text-sm text-gray-600">
                For nå må du laste opp bildet et annet sted og legge inn URL-en. Bildeopplasting kommer senere.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Oppretter..." : "Opprett parkeringsplass"}
              </button>
              <Link
                href="/dashboard/parking-spots"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Avbryt
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

