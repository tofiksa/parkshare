"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface ParkingSpot {
  id: string
  address: string
  latitude: number | null
  longitude: number | null
  pricePerHour: number
  pricePerMinute?: number
  type: "UTENDORS" | "INNENDORS"
  zoneNumber?: string | null
  zoneName?: string | null
  operator?: string | null
}

interface MapProps {
  parkingSpots: ParkingSpot[]
  userLocation: { lat: number; lng: number } | null
  onMarkerClick: (spotId: string) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
}

export default function Map({ parkingSpots, userLocation, onMarkerClick, onBoundsChange }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Initialize map
    if (!mapRef.current) {
      const center: [number, number] = userLocation 
        ? [userLocation.lat, userLocation.lng]
        : [59.9139, 10.7522] // Default to Oslo

      // Zoom level 15 tilsvarer ca. 1km radius
      mapRef.current = L.map(mapContainerRef.current).setView(center, 15)

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
    }

    const map = mapRef.current

    // Clear existing markers
    markersRef.current.forEach(marker => {
      map.removeLayer(marker)
    })
    markersRef.current = []

    // Add user location marker
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "user-location-marker",
        html: '<div style="width: 20px; height: 20px; border-radius: 50%; background: #3b82f6; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("Din lokasjon")
      markersRef.current.push(userMarker)
    }

    // Add parking spot markers
    parkingSpots.forEach((spot) => {
      if (spot.latitude && spot.longitude) {
        const iconColor = spot.type === "UTENDORS" ? "#10b981" : "#3b82f6"
        const customIcon = L.divIcon({
          className: "parking-marker",
          html: `<div style="width: 30px; height: 30px; border-radius: 50%; background: ${iconColor}; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">P</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })

        const zoneInfo = spot.zoneNumber 
          ? `P ${spot.zoneNumber}${spot.zoneName ? ` - ${spot.zoneName}` : ""}`
          : spot.address
        const priceInfo = spot.pricePerMinute 
          ? `${spot.pricePerMinute.toFixed(2)} NOK/min`
          : `${spot.pricePerHour} NOK/time`

        const marker = L.marker([spot.latitude, spot.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div>
              <strong>${zoneInfo}</strong><br/>
              ${priceInfo}<br/>
              ${spot.operator ? `${spot.operator}<br/>` : ""}
              ${spot.type === "UTENDORS" ? "Utendørs" : "Innendørs"}
            </div>
          `)

        marker.on("click", () => {
          onMarkerClick(spot.id)
        })
        
        markersRef.current.push(marker)
      }
    })

    // Funksjon for å sende bounds til parent
    const updateBounds = () => {
      if (onBoundsChange && map) {
        // Vent litt for å sikre at kartet er ferdig med å laste
        setTimeout(() => {
          if (map && map.getBounds) {
            const bounds = map.getBounds()
            onBoundsChange({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest(),
            })
          }
        }, 100)
      }
    }

    // Send initial bounds etter at kartet er ferdig initialisert
    setTimeout(updateBounds, 200)

    // Lytte på zoom og pan endringer
    map.on("moveend", updateBounds)
    map.on("zoomend", updateBounds)

    // Cleanup
    return () => {
      map.off("moveend", updateBounds)
      map.off("zoomend", updateBounds)
    }
  }, [parkingSpots, userLocation, onMarkerClick, onBoundsChange])

  return <div ref={mapContainerRef} className="h-full w-full" />
}

