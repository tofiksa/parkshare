"use client"

import { useEffect, useRef, useState } from "react"
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
  // Rektangel-koordinater
  rectNorthLat?: number | null
  rectSouthLat?: number | null
  rectEastLng?: number | null
  rectWestLng?: number | null
  rectWidthMeters?: number | null
  rectHeightMeters?: number | null
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
  const rectanglesRef = useRef<L.Rectangle[]>([])
  const zoomLevelRef = useRef<number>(15)
  const [renderKey, setRenderKey] = useState(0)

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

    // Oppdater zoom-nivå - hent alltid fra kartet for å sikre korrekt verdi
    const currentZoom = map.getZoom()
    zoomLevelRef.current = currentZoom

    // Funksjon for å beregne rektangel-koordinater fra senter og størrelse
    const calculateRectBounds = (lat: number, lng: number, widthMeters: number, heightMeters: number) => {
      // Omtrentlig konvertering: 1 grad lat ≈ 111 km, 1 grad lng ≈ 111 km * cos(lat)
      const latOffset = heightMeters / 111000 / 2
      const lngOffset = widthMeters / (111000 * Math.cos(lat * Math.PI / 180)) / 2
      
      return {
        north: lat + latOffset,
        south: lat - latOffset,
        east: lng + lngOffset,
        west: lng - lngOffset,
      }
    }

    // Clear existing markers and rectangles
    markersRef.current.forEach(marker => {
      map.removeLayer(marker)
    })
    markersRef.current = []
    
    rectanglesRef.current.forEach(rect => {
      map.removeLayer(rect)
    })
    rectanglesRef.current = []

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

    // Bestem om vi skal vise rektangler eller markører basert på zoom-nivå
    // Zoom >= 15: vis rektangler (når brukeren er nok zoomet inn til å se individuelle plasser)
    // Zoom < 15: vis markører (P-ikoner for oversikt)
    // Bruk currentZoom direkte i stedet for ref for å sikre korrekt verdi
    const showRectangles = currentZoom >= 15
    
    // Debug logging
    console.log("🗺️ Map render - Zoom:", currentZoom, "Show rectangles:", showRectangles, "Max zoom:", map.getMaxZoom())
    console.log("🗺️ Parking spots count:", parkingSpots.length)
    if (parkingSpots.length > 0) {
      const firstSpot = parkingSpots[0]
      console.log("🗺️ First spot rect data:", {
        id: firstSpot.id,
        address: firstSpot.address,
        hasRectCoords: !!(firstSpot.rectNorthLat && firstSpot.rectSouthLat && firstSpot.rectEastLng && firstSpot.rectWestLng),
        hasRectSize: !!(firstSpot.rectWidthMeters && firstSpot.rectHeightMeters),
        rectNorthLat: firstSpot.rectNorthLat,
        rectSouthLat: firstSpot.rectSouthLat,
        rectEastLng: firstSpot.rectEastLng,
        rectWestLng: firstSpot.rectWestLng,
        rectWidthMeters: firstSpot.rectWidthMeters,
        rectHeightMeters: firstSpot.rectHeightMeters,
      })
    }

    // Hjelpefunksjon for popup-innhold
    const getPopupContent = (spot: ParkingSpot) => {
      const zoneInfo = spot.zoneNumber 
        ? `P ${spot.zoneNumber}${spot.zoneName ? ` - ${spot.zoneName}` : ""}`
        : spot.address
      const priceInfo = spot.pricePerMinute 
        ? `${spot.pricePerMinute.toFixed(2)} NOK/min`
        : `${spot.pricePerHour} NOK/time`
      
      return `
        <div>
          <strong>${zoneInfo}</strong><br/>
          ${priceInfo}<br/>
          ${spot.operator ? `${spot.operator}<br/>` : ""}
          ${spot.type === "UTENDORS" ? "Utendørs" : "Innendørs"}
        </div>
      `
    }

    // Add parking spots as rectangles or markers
    parkingSpots.forEach((spot) => {
      if (!spot.latitude || !spot.longitude) return

      const zoneInfo = spot.zoneNumber 
        ? `P ${spot.zoneNumber}${spot.zoneName ? ` - ${spot.zoneName}` : ""}`
        : spot.address
      const priceInfo = spot.pricePerMinute 
        ? `${spot.pricePerMinute.toFixed(2)} NOK/min`
        : `${spot.pricePerHour} NOK/time`

      if (showRectangles && spot.rectNorthLat && spot.rectSouthLat && spot.rectEastLng && spot.rectWestLng) {
        // Vis rektangel hvis vi har koordinater
        const bounds: [[number, number], [number, number]] = [
          [spot.rectSouthLat, spot.rectWestLng],
          [spot.rectNorthLat, spot.rectEastLng]
        ]

        console.log(`✅ Tegner rektangel for spot ${spot.id} (${spot.address}):`, {
          bounds,
          type: spot.type,
          zoom: zoomLevelRef.current,
          center: [spot.latitude, spot.longitude],
        })

        // Lett grønn farge med opacity (rgba(144, 238, 144, 0.4) = lightgreen med 40% opacity)
        // Full rektangel skal være lettere grønn (rgba(200, 255, 200, 0.3))
        const fillColor = spot.type === "UTENDORS" 
          ? "rgba(200, 255, 200, 0.5)" // Lettere grønn for full - økt opacity for bedre synlighet
          : "rgba(144, 238, 144, 0.5)"  // Lett grønn med opacity - økt opacity
        const color = spot.type === "UTENDORS" 
          ? "#10b981" // Mørkere grønn border for bedre synlighet
          : "#7CB342" // Litt mørkere grønn for innendørs

        const rectangle = L.rectangle(bounds, {
          color: color,
          fillColor: fillColor,
          fillOpacity: 0.5, // Økt fra 0.3 til 0.5 for bedre synlighet
          weight: 3, // Økt fra 2 til 3 for tykkere border
        })
          .addTo(map)
          .bindPopup(getPopupContent(spot))

        rectangle.on("click", () => {
          onMarkerClick(spot.id)
        })

        rectanglesRef.current.push(rectangle)
        console.log(`✅ Rektangel lagt til kartet for spot ${spot.id}`)
      } else if (showRectangles && spot.rectWidthMeters && spot.rectHeightMeters) {
        // Hvis vi har størrelse men ikke koordinater, beregn fra senter
        const bounds = calculateRectBounds(
          spot.latitude,
          spot.longitude,
          spot.rectWidthMeters,
          spot.rectHeightMeters
        )

        const rectBounds: [[number, number], [number, number]] = [
          [bounds.south, bounds.west],
          [bounds.north, bounds.east]
        ]

        console.log(`✅ Tegner rektangel (beregnet) for spot ${spot.id}:`, {
          bounds: rectBounds,
          width: spot.rectWidthMeters,
          height: spot.rectHeightMeters,
          type: spot.type,
        })

        const fillColor = spot.type === "UTENDORS" 
          ? "rgba(200, 255, 200, 0.5)" // Økt opacity
          : "rgba(144, 238, 144, 0.5)"  // Økt opacity
        const color = spot.type === "UTENDORS" 
          ? "#10b981" // Mørkere grønn for bedre synlighet
          : "#7CB342"

        const rectangle = L.rectangle(rectBounds, {
          color: color,
          fillColor: fillColor,
          fillOpacity: 0.5, // Økt fra 0.3 til 0.5
          weight: 3, // Økt fra 2 til 3
        })
          .addTo(map)
          .bindPopup(getPopupContent(spot))

        rectangle.on("click", () => {
          onMarkerClick(spot.id)
        })

        rectanglesRef.current.push(rectangle)
        console.log(`✅ Rektangel (beregnet) lagt til kartet for spot ${spot.id}`)
      } else {
        // Vis markør ved zoom ut eller hvis vi ikke har rektangel-data
        if (showRectangles) {
          console.warn(`⚠️ Spot ${spot.id} mangler rektangel-data:`, {
            hasRectCoords: !!(spot.rectNorthLat && spot.rectSouthLat && spot.rectEastLng && spot.rectWestLng),
            hasRectSize: !!(spot.rectWidthMeters && spot.rectHeightMeters),
            zoom: currentZoom,
          })
        } else {
          console.log(`📍 Tegner P-ikon for spot ${spot.id} (zoom ${currentZoom} < 15)`)
        }
        const iconColor = spot.type === "UTENDORS" ? "#10b981" : "#3b82f6"
        const customIcon = L.divIcon({
          className: "parking-marker",
          html: `<div style="width: 30px; height: 30px; border-radius: 50%; background: ${iconColor}; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">P</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })

        const marker = L.marker([spot.latitude, spot.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(getPopupContent(spot))

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
    const handleZoomChange = () => {
      const newZoom = map.getZoom()
      console.log("🔍 Zoom changed to:", newZoom, "Will show rectangles:", newZoom >= 15)
      zoomLevelRef.current = newZoom
      updateBounds()
      // Force re-render for å bytte mellom rektangler og markører
      // Dette vil trigge useEffect på nytt med riktig zoom-nivå
      setRenderKey(prev => prev + 1)
    }

    // Lytte på zoomstart også for raskere respons
    const handleZoomStart = () => {
      const newZoom = map.getZoom()
      zoomLevelRef.current = newZoom
    }

    map.on("moveend", updateBounds)
    map.on("zoomstart", handleZoomStart)
    map.on("zoomend", handleZoomChange)

    // Cleanup
    return () => {
      map.off("moveend", updateBounds)
      map.off("zoomstart", handleZoomStart)
      map.off("zoomend", handleZoomChange)
    }
  }, [parkingSpots, userLocation, onMarkerClick, onBoundsChange, renderKey])

  return <div ref={mapContainerRef} className="h-full w-full" />
}

