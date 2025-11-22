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
  type: "UTENDORS" | "INNENDORS"
}

interface MapProps {
  parkingSpots: ParkingSpot[]
  userLocation: { lat: number; lng: number } | null
  onMarkerClick: (spotId: string) => void
}

export default function Map({ parkingSpots, userLocation, onMarkerClick }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Initialize map
    if (!mapRef.current) {
      const center: [number, number] = userLocation 
        ? [userLocation.lat, userLocation.lng]
        : [59.9139, 10.7522] // Default to Oslo

      mapRef.current = L.map(mapContainerRef.current).setView(center, 13)

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
    }

    const map = mapRef.current

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    // Add user location marker
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "user-location-marker",
        html: '<div style="width: 20px; height: 20px; border-radius: 50%; background: #3b82f6; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("Din lokasjon")
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

        const marker = L.marker([spot.latitude, spot.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div>
              <strong>${spot.address}</strong><br/>
              ${spot.pricePerHour} NOK/time<br/>
              ${spot.type === "UTENDORS" ? "Utendørs" : "Innendørs"}
            </div>
          `)

        marker.on("click", () => {
          onMarkerClick(spot.id)
        })
      }
    })

    // Fit map to show all markers
    if (parkingSpots.length > 0 || userLocation) {
      const points: [number, number][] = [
        ...parkingSpots
          .filter((s) => s.latitude && s.longitude)
          .map((s) => [s.latitude!, s.longitude!] as [number, number]),
        ...(userLocation ? [[userLocation.lat, userLocation.lng] as [number, number]] : []),
      ]
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [parkingSpots, userLocation, onMarkerClick])

  return <div ref={mapContainerRef} className="h-full w-full" />
}

