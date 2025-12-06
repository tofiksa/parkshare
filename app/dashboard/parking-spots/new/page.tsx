"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import dynamic from "next/dynamic"

// Dynamisk import av kartkomponenten for å unngå SSR problemer
const ParkingSpotDrawMap = dynamic(() => import("@/components/ParkingSpotDrawMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500">Laster kart...</p>
    </div>
  ),
})

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
    // Polygon-koordinater
    rectCorner1Lat: "",
    rectCorner1Lng: "",
    rectCorner2Lat: "",
    rectCorner2Lng: "",
    rectCorner3Lat: "",
    rectCorner3Lng: "",
    rectCorner4Lat: "",
    rectCorner4Lng: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [gettingAddressLocation, setGettingAddressLocation] = useState(false)

  // Callback for updating input fields when vertices are added
  const handleVertexAdded = useCallback((vertexIndex: number, lat: number, lng: number) => {
    setFormData((prevData) => {
      const updates: Partial<typeof formData> = {}
      
      // Update the corresponding corner based on vertex index
      switch (vertexIndex) {
        case 0:
          updates.rectCorner1Lat = lat.toString()
          updates.rectCorner1Lng = lng.toString()
          break
        case 1:
          updates.rectCorner2Lat = lat.toString()
          updates.rectCorner2Lng = lng.toString()
          break
        case 2:
          updates.rectCorner3Lat = lat.toString()
          updates.rectCorner3Lng = lng.toString()
          break
        case 3:
          updates.rectCorner4Lat = lat.toString()
          updates.rectCorner4Lng = lng.toString()
          break
      }
      
      return { ...prevData, ...updates }
    })
  }, [])

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

  const getAddressLocation = async () => {
    if (!formData.address || formData.address.trim() === "") {
      setError("Vennligst skriv inn en adresse først")
      return
    }

    setGettingAddressLocation(true)
    setError("")

    try {
      // Use Nominatim (OpenStreetMap) for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Parkshare App'
          }
        }
      )

      if (!response.ok) {
        throw new Error("Kunne ikke hente adresse")
      }

      const data = await response.json()

      if (data && data.length > 0) {
        const result = data[0]
        setFormData({
          ...formData,
          latitude: result.lat,
          longitude: result.lon,
        })
        fetchSuggestedPrice()
      } else {
        setError("Kunne ikke finne adressen. Prøv en mer spesifikk adresse.")
      }
    } catch (err) {
      setError("Kunne ikke hente lokasjon for adressen: " + (err instanceof Error ? err.message : "Ukjent feil"))
    } finally {
      setGettingAddressLocation(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Kun bilder er tillatt")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Bildet er for stort. Maksimal størrelse er 5MB.")
      return
    }

    setImageFile(file)
    setUploadingImage(true)
    setError("")

    try {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload image
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const uploadResponse = await fetch("/api/upload/image", {
        method: "POST",
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json()
        throw new Error(uploadError.error || "Kunne ikke laste opp bilde")
      }

      const uploadData = await uploadResponse.json()
      setFormData({ ...formData, imageUrl: uploadData.url })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke laste opp bilde")
      setImageFile(null)
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validering
    if (!formData.address || formData.address.length < 5) {
      setError("Adresse må være minst 5 tegn")
      return
    }

    // Valider at polygon-koordinater er satt for alle typer
    if (
      !formData.rectCorner1Lat ||
      !formData.rectCorner1Lng ||
      !formData.rectCorner2Lat ||
      !formData.rectCorner2Lng ||
      !formData.rectCorner3Lat ||
      !formData.rectCorner3Lng ||
      !formData.rectCorner4Lat ||
      !formData.rectCorner4Lng
    ) {
      setError("Du må tegne parkeringsplassen på kartet før du kan opprette den")
      return
    }

    // For utendørs plasser, krever vi også GPS-koordinater
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
          // Polygon-koordinater
          rectCorner1Lat: formData.rectCorner1Lat ? parseFloat(formData.rectCorner1Lat) : undefined,
          rectCorner1Lng: formData.rectCorner1Lng ? parseFloat(formData.rectCorner1Lng) : undefined,
          rectCorner2Lat: formData.rectCorner2Lat ? parseFloat(formData.rectCorner2Lat) : undefined,
          rectCorner2Lng: formData.rectCorner2Lng ? parseFloat(formData.rectCorner2Lng) : undefined,
          rectCorner3Lat: formData.rectCorner3Lat ? parseFloat(formData.rectCorner3Lat) : undefined,
          rectCorner3Lng: formData.rectCorner3Lng ? parseFloat(formData.rectCorner3Lng) : undefined,
          rectCorner4Lat: formData.rectCorner4Lat ? parseFloat(formData.rectCorner4Lat) : undefined,
          rectCorner4Lng: formData.rectCorner4Lng ? parseFloat(formData.rectCorner4Lng) : undefined,
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Gateadresse, postnummer, by"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tegn parkeringsplass på kartet *
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Klikk på "Start tegning" knappen nederst til venstre på kartet og tegn en firkant som representerer parkeringsplassen. 
                  Du må tegne nøyaktig 4 hjørnepunkter. Du kan dra punktene for å justere posisjonen.
                </p>
                {formData.type === "UTENDORS" && (
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {gettingLocation ? "Henter lokasjon..." : "Senter kart på min lokasjon"}
                    </button>
                    <button
                      type="button"
                      onClick={getAddressLocation}
                      disabled={gettingAddressLocation || !formData.address || formData.address.trim() === ""}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {gettingAddressLocation ? "Henter adresse..." : "Senter kart på adresse"}
                    </button>
                  </div>
                )}
              </div>
              <ParkingSpotDrawMap
                center={
                  formData.latitude && formData.longitude
                    ? {
                        lat: parseFloat(formData.latitude),
                        lng: parseFloat(formData.longitude),
                      }
                    : undefined
                }
                onPolygonDrawn={(corners) => {
                  setFormData((prevData) => {
                    // Check if coordinates have actually changed to avoid unnecessary updates
                    const cornersChanged =
                      Math.abs(parseFloat(prevData.rectCorner1Lat || "0") - corners.rectCorner1Lat) > 0.000001 ||
                      Math.abs(parseFloat(prevData.rectCorner1Lng || "0") - corners.rectCorner1Lng) > 0.000001 ||
                      Math.abs(parseFloat(prevData.rectCorner2Lat || "0") - corners.rectCorner2Lat) > 0.000001 ||
                      Math.abs(parseFloat(prevData.rectCorner2Lng || "0") - corners.rectCorner2Lng) > 0.000001 ||
                      Math.abs(parseFloat(prevData.rectCorner3Lat || "0") - corners.rectCorner3Lat) > 0.000001 ||
                      Math.abs(parseFloat(prevData.rectCorner3Lng || "0") - corners.rectCorner3Lng) > 0.000001 ||
                      Math.abs(parseFloat(prevData.rectCorner4Lat || "0") - corners.rectCorner4Lat) > 0.000001 ||
                      Math.abs(parseFloat(prevData.rectCorner4Lng || "0") - corners.rectCorner4Lng) > 0.000001

                    // Always update center point, but only update corners if they changed
                    const newData = {
                      ...prevData,
                      latitude: corners.centerLat.toString(),
                      longitude: corners.centerLng.toString(),
                      ...(cornersChanged && {
                        rectCorner1Lat: corners.rectCorner1Lat.toString(),
                        rectCorner1Lng: corners.rectCorner1Lng.toString(),
                        rectCorner2Lat: corners.rectCorner2Lat.toString(),
                        rectCorner2Lng: corners.rectCorner2Lng.toString(),
                        rectCorner3Lat: corners.rectCorner3Lat.toString(),
                        rectCorner3Lng: corners.rectCorner3Lng.toString(),
                        rectCorner4Lat: corners.rectCorner4Lat.toString(),
                        rectCorner4Lng: corners.rectCorner4Lng.toString(),
                      }),
                    }
                    return newData
                  })
                }}
                onVertexAdded={handleVertexAdded}
                initialPolygon={
                  formData.rectCorner1Lat &&
                  formData.rectCorner1Lng &&
                  formData.rectCorner2Lat &&
                  formData.rectCorner2Lng &&
                  formData.rectCorner3Lat &&
                  formData.rectCorner3Lng &&
                  formData.rectCorner4Lat &&
                  formData.rectCorner4Lng
                    ? {
                        rectCorner1Lat: parseFloat(formData.rectCorner1Lat),
                        rectCorner1Lng: parseFloat(formData.rectCorner1Lng),
                        rectCorner2Lat: parseFloat(formData.rectCorner2Lat),
                        rectCorner2Lng: parseFloat(formData.rectCorner2Lng),
                        rectCorner3Lat: parseFloat(formData.rectCorner3Lat),
                        rectCorner3Lng: parseFloat(formData.rectCorner3Lng),
                        rectCorner4Lat: parseFloat(formData.rectCorner4Lat),
                        rectCorner4Lng: parseFloat(formData.rectCorner4Lng),
                      }
                    : null
                }
                polygonFromInput={
                  formData.rectCorner1Lat &&
                  formData.rectCorner1Lng &&
                  formData.rectCorner2Lat &&
                  formData.rectCorner2Lng &&
                  formData.rectCorner3Lat &&
                  formData.rectCorner3Lng &&
                  formData.rectCorner4Lat &&
                  formData.rectCorner4Lng
                    ? {
                        rectCorner1Lat: parseFloat(formData.rectCorner1Lat) || 0,
                        rectCorner1Lng: parseFloat(formData.rectCorner1Lng) || 0,
                        rectCorner2Lat: parseFloat(formData.rectCorner2Lat) || 0,
                        rectCorner2Lng: parseFloat(formData.rectCorner2Lng) || 0,
                        rectCorner3Lat: parseFloat(formData.rectCorner3Lat) || 0,
                        rectCorner3Lng: parseFloat(formData.rectCorner3Lng) || 0,
                        rectCorner4Lat: parseFloat(formData.rectCorner4Lat) || 0,
                        rectCorner4Lng: parseFloat(formData.rectCorner4Lng) || 0,
                      }
                    : null
                }
              />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Instruksjoner:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Klikk på "Start tegning" knappen nederst til venstre på kartet</li>
                  <li>Klikk på kartet for å plassere de 4 hjørnepunktene (du kan også dra eksisterende punkter for å flytte dem)</li>
                  <li>Klikk på "Fullfør" knappen når du har lagt til 4 punkter (knappen er deaktivert hvis linjene krysser hverandre)</li>
                  <li>Du kan redigere polygonen ved å klikke "Rediger tegning" og deretter dra punktene til ønsket posisjon</li>
                  <li>Koordinatene fylles automatisk i inputfeltene nedenfor mens du tegner</li>
                </ul>
              </div>

              {/* Koordinat-inputfelt */}
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Polygon-koordinater (4 hjørnepunkter)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hjørne 1 */}
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">Hjørne 1</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Breddegrad</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.rectCorner1Lat}
                          onChange={(e) =>
                            setFormData({ ...formData, rectCorner1Lat: e.target.value })
                          }
                          className="w-full text-sm rounded border border-gray-300 px-2 py-1 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Lengdegrad</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.rectCorner1Lng}
                          onChange={(e) =>
                            setFormData({ ...formData, rectCorner1Lng: e.target.value })
                          }
                          className="w-full text-sm rounded border border-gray-300 px-2 py-1 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hjørne 2 */}
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">Hjørne 2</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Breddegrad</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.rectCorner2Lat}
                          onChange={(e) =>
                            setFormData({ ...formData, rectCorner2Lat: e.target.value })
                          }
                          className="w-full text-sm rounded border border-gray-300 px-2 py-1 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Lengdegrad</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.rectCorner2Lng}
                          onChange={(e) =>
                            setFormData({ ...formData, rectCorner2Lng: e.target.value })
                          }
                          className="w-full text-sm rounded border border-gray-300 px-2 py-1 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hjørne 3 */}
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">Hjørne 3</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Breddegrad</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.rectCorner3Lat}
                          onChange={(e) =>
                            setFormData({ ...formData, rectCorner3Lat: e.target.value })
                          }
                          className="w-full text-sm rounded border border-gray-300 px-2 py-1 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Lengdegrad</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.rectCorner3Lng}
                          onChange={(e) =>
                            setFormData({ ...formData, rectCorner3Lng: e.target.value })
                          }
                          className="w-full text-sm rounded border border-gray-300 px-2 py-1 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hjørne 4 */}
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">Hjørne 4</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Breddegrad</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.rectCorner4Lat}
                          onChange={(e) =>
                            setFormData({ ...formData, rectCorner4Lat: e.target.value })
                          }
                          className="w-full text-sm rounded border border-gray-300 px-2 py-1 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Lengdegrad</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.rectCorner4Lng}
                          onChange={(e) =>
                            setFormData({ ...formData, rectCorner4Lng: e.target.value })
                          }
                          className="w-full text-sm rounded border border-gray-300 px-2 py-1 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Senterpunkt */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Senterpunkt (beregnet automatisk)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Breddegrad</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude}
                        readOnly
                        className="w-full text-sm rounded border border-gray-300 px-2 py-1 bg-gray-100 text-gray-900"
                        placeholder="59.9139"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Lengdegrad</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude}
                        readOnly
                        className="w-full text-sm rounded border border-gray-300 px-2 py-1 bg-gray-100 text-gray-900"
                        placeholder="10.7522"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Beskriv parkeringsplassen..."
              />
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-semibold text-gray-700 mb-2">
                Bilde (valgfritt)
              </label>
              
              {imagePreview ? (
                <div className="mb-4">
                  <img
                    src={imagePreview}
                    alt="Forhåndsvisning"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null)
                      setImageFile(null)
                      setFormData({ ...formData, imageUrl: "" })
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Fjern bilde
                  </button>
                </div>
              ) : (
                <div className="mb-4">
                  <label
                    htmlFor="image"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-8 h-8 mb-2 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Klikk for å laste opp</span> eller dra og slipp
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, WebP (maks 5MB)</p>
                    </div>
                    <input
                      id="image"
                      name="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  {uploadingImage && (
                    <p className="mt-2 text-sm text-blue-600">Laster opp bilde...</p>
                  )}
                </div>
              )}

              <div className="text-sm text-gray-500">
                <p>Du kan også legge inn en bilde-URL hvis bildet allerede er på nettet:</p>
                <input
                  id="imageUrl"
                  name="imageUrl"
                  type="url"
                  value={formData.imageUrl && !imagePreview ? formData.imageUrl : ""}
                  onChange={(e) => {
                    if (!imagePreview) {
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                  }}
                  disabled={!!imagePreview}
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
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

