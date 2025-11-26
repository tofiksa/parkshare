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
  // Rektangel-koordinater (for bakoverkompatibilitet)
  rectNorthLat?: number | null
  rectSouthLat?: number | null
  rectEastLng?: number | null
  rectWestLng?: number | null
  rectWidthMeters?: number | null
  rectHeightMeters?: number | null
  // Polygon-koordinater for roterte rektangler (fire hjørnepunkter)
  rectCorner1Lat?: number | null
  rectCorner1Lng?: number | null
  rectCorner2Lat?: number | null
  rectCorner2Lng?: number | null
  rectCorner3Lat?: number | null
  rectCorner3Lng?: number | null
  rectCorner4Lat?: number | null
  rectCorner4Lng?: number | null
}

interface MapProps {
  parkingSpots: ParkingSpot[]
  userLocation: { lat: number; lng: number } | null
  onMarkerClick: (spotId: string) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  selectedSpotId?: string | null // ID for valgt parkeringsplass
}

export default function Map({ 
  parkingSpots = [], 
  userLocation = null, 
  onMarkerClick, 
  onBoundsChange, 
  selectedSpotId = null 
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])
  const markersMapRef = useRef<{ [key: string]: L.Marker }>({}) // Objekt for å holde markører per ID
  const rectanglesRef = useRef<(L.Rectangle | L.Polygon)[]>([])
  const rectanglesMapRef = useRef<{ [key: string]: L.Rectangle | L.Polygon }>({}) // Objekt for å holde rektangler per ID
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

    // Clear existing markers and rectangles (kun hvis parkingSpots har endret seg)
    // Vi beholder eksisterende markører og oppdaterer dem i stedet for å lage nye
    const existingMarkerIds = Object.keys(markersMapRef.current)
    const currentSpotIds = new Set(parkingSpots.map(s => s.id))
    
    // Fjern markører som ikke lenger eksisterer
    existingMarkerIds.forEach(id => {
      if (!currentSpotIds.has(id)) {
        const marker = markersMapRef.current[id]
        if (marker) {
          map.removeLayer(marker)
          delete markersMapRef.current[id]
        }
      }
    })
    
    const existingRectIds = Object.keys(rectanglesMapRef.current)
    // Fjern rektangler som ikke lenger eksisterer
    existingRectIds.forEach(id => {
      if (!currentSpotIds.has(id)) {
        const rect = rectanglesMapRef.current[id]
        if (rect) {
          map.removeLayer(rect)
          delete rectanglesMapRef.current[id]
        }
      }
    })
    
    // Oppdater arrays for bakoverkompatibilitet
    markersRef.current = Object.values(markersMapRef.current)
    rectanglesRef.current = Object.values(rectanglesMapRef.current)

    // Add user location marker
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "user-location-marker",
        html: '<div style="width: 20px; height: 20px; border-radius: 50%; background: #3b82f6; border: 3px solid white; box-shadow: none !important;"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { 
        icon: userIcon,
        shadowPane: undefined, // Deaktiver shadow
      })
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
    
    // Fjern markører hvis vi skal vise rektangler, og fjern rektangler hvis vi skal vise markører
    if (showRectangles) {
      // Fjern alle P-ikoner (markører) når vi viser rektangler
      Object.values(markersMapRef.current).forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker)
        }
      })
      // Tøm markersMapRef når vi viser rektangler
      markersMapRef.current = {}
      markersRef.current = []
    } else {
      // Fjern alle rektangler/polygoner når vi viser markører
      Object.values(rectanglesMapRef.current).forEach(rect => {
        if (map.hasLayer(rect)) {
          map.removeLayer(rect)
        }
      })
      // Tøm rectanglesMapRef når vi viser markører
      rectanglesMapRef.current = {}
      rectanglesRef.current = []
    }
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

      // Sjekk først om vi har polygon-koordinater (rotert rektangel)
      if (showRectangles && 
          spot.rectCorner1Lat && spot.rectCorner1Lng &&
          spot.rectCorner2Lat && spot.rectCorner2Lng &&
          spot.rectCorner3Lat && spot.rectCorner3Lng &&
          spot.rectCorner4Lat && spot.rectCorner4Lng) {
        
        // Sjekk om polygon allerede eksisterer
        const existingPolygon = rectanglesMapRef.current[spot.id] as L.Polygon | undefined
        
        if (existingPolygon) {
          // Oppdater bare stilen, ikke lag ny
          const isSelected = selectedSpotId === spot.id
          const fillColor = isSelected
            ? "rgba(239, 68, 68, 0.6)"
            : spot.type === "UTENDORS" 
              ? "rgba(200, 255, 200, 0.5)"
              : "rgba(144, 238, 144, 0.5)"
          const color = isSelected
            ? "#dc2626"
            : spot.type === "UTENDORS" 
              ? "#10b981"
              : "#7CB342"
          
          existingPolygon.setStyle({
            color: color,
            fillColor: fillColor,
            fillOpacity: isSelected ? 0.6 : 0.5,
            weight: isSelected ? 4 : 3,
          })
        } else {
          // Lag ny polygon
          const polygonCoords: [number, number][] = [
            [spot.rectCorner1Lat, spot.rectCorner1Lng],
            [spot.rectCorner2Lat, spot.rectCorner2Lng],
            [spot.rectCorner3Lat, spot.rectCorner3Lng],
            [spot.rectCorner4Lat, spot.rectCorner4Lng],
            [spot.rectCorner1Lat, spot.rectCorner1Lng], // Lukk polygon
          ]

          const isSelected = selectedSpotId === spot.id
          const fillColor = isSelected
            ? "rgba(239, 68, 68, 0.6)"
            : spot.type === "UTENDORS" 
              ? "rgba(200, 255, 200, 0.5)"
              : "rgba(144, 238, 144, 0.5)"
          const color = isSelected
            ? "#dc2626"
            : spot.type === "UTENDORS" 
              ? "#10b981"
              : "#7CB342"

          const polygon = L.polygon(polygonCoords, {
            color: color,
            fillColor: fillColor,
            fillOpacity: isSelected ? 0.6 : 0.5,
            weight: isSelected ? 4 : 3,
            interactive: true,
          })
            .addTo(map)
            // Ikke bind popup - det kan forhindre klikk
            // .bindPopup(getPopupContent(spot))

          // Gjør polygon klikkbar - én klikk skal være nok
          polygon.on("click", (e) => {
            e.originalEvent.stopPropagation()
            e.originalEvent.preventDefault()
            onMarkerClick(spot.id)
          })
          
          // Legg til popup på hover i stedet
          polygon.on("mouseover", function(this: L.Polygon) {
            if (selectedSpotId !== spot.id) {
              this.setStyle({
                weight: 4,
                fillOpacity: 0.7,
              })
            }
            if (map) {
              map.getContainer().style.cursor = "pointer"
            }
            // Vis popup på hover
            const popup = L.popup().setContent(getPopupContent(spot))
            this.bindPopup(popup).openPopup()
          })
          
          // Hover-effekt (allerede håndtert over)
          
          polygon.on("mouseout", function(this: L.Polygon) {
            const currentIsSelected = selectedSpotId === spot.id
            this.setStyle({
              weight: currentIsSelected ? 4 : 3,
              fillOpacity: currentIsSelected ? 0.6 : 0.5,
            })
            if (map) {
              map.getContainer().style.cursor = ""
            }
          })

          rectanglesMapRef.current[spot.id] = polygon
          rectanglesRef.current.push(polygon as any)
        }
      } else if (showRectangles && spot.rectNorthLat && spot.rectSouthLat && spot.rectEastLng && spot.rectWestLng) {
        // Fallback: Vis rektangel hvis vi har bounds-koordinater (ikke-rotert)
        const existingRect = rectanglesMapRef.current[spot.id] as L.Rectangle | undefined
        
        if (existingRect) {
          // Oppdater bare stilen
          const isSelected = selectedSpotId === spot.id
          const fillColor = isSelected
            ? "rgba(239, 68, 68, 0.6)"
            : spot.type === "UTENDORS" 
              ? "rgba(200, 255, 200, 0.5)"
              : "rgba(144, 238, 144, 0.5)"
          const color = isSelected
            ? "#dc2626"
            : spot.type === "UTENDORS" 
              ? "#10b981"
              : "#7CB342"
          
          existingRect.setStyle({
            color: color,
            fillColor: fillColor,
            fillOpacity: isSelected ? 0.6 : 0.5,
            weight: isSelected ? 4 : 3,
          })
        } else {
          // Lag ny rektangel
          const bounds: [[number, number], [number, number]] = [
            [spot.rectSouthLat, spot.rectWestLng],
            [spot.rectNorthLat, spot.rectEastLng]
          ]

          const isSelected = selectedSpotId === spot.id
          const fillColor = isSelected
            ? "rgba(239, 68, 68, 0.6)"
            : spot.type === "UTENDORS" 
              ? "rgba(200, 255, 200, 0.5)"
              : "rgba(144, 238, 144, 0.5)"
          const color = isSelected
            ? "#dc2626"
            : spot.type === "UTENDORS" 
              ? "#10b981"
              : "#7CB342"

          const rectangle = L.rectangle(bounds, {
            color: color,
            fillColor: fillColor,
            fillOpacity: isSelected ? 0.6 : 0.5,
            weight: isSelected ? 4 : 3,
            interactive: true,
          })
            .addTo(map)
            // Ikke bind popup - det kan forhindre klikk

          // Gjør rektangel klikkbar - én klikk skal være nok
          rectangle.on("click", (e) => {
            e.originalEvent.stopPropagation()
            e.originalEvent.preventDefault()
            onMarkerClick(spot.id)
          })
          
          // Hover-effekt med popup
          rectangle.on("mouseover", function(this: L.Rectangle) {
            if (selectedSpotId !== spot.id) {
              this.setStyle({
                weight: 4,
                fillOpacity: 0.7,
              })
            }
            if (map) {
              map.getContainer().style.cursor = "pointer"
            }
            // Vis popup på hover
            const popup = L.popup().setContent(getPopupContent(spot))
            this.bindPopup(popup).openPopup()
          })
          
          rectangle.on("mouseout", function(this: L.Rectangle) {
            const currentIsSelected = selectedSpotId === spot.id
            this.setStyle({
              weight: currentIsSelected ? 4 : 3,
              fillOpacity: currentIsSelected ? 0.6 : 0.5,
            })
            if (map) {
              map.getContainer().style.cursor = ""
            }
          })

          rectanglesMapRef.current[spot.id] = rectangle
          rectanglesRef.current.push(rectangle)
        }
      } else if (showRectangles && spot.rectWidthMeters && spot.rectHeightMeters) {
        // Hvis vi har størrelse men ikke koordinater, beregn fra senter
        const existingRect = rectanglesMapRef.current[spot.id] as L.Rectangle | undefined
        
        if (existingRect) {
          // Oppdater bare stilen
          const isSelected = selectedSpotId === spot.id
          const fillColor = isSelected
            ? "rgba(239, 68, 68, 0.6)"
            : spot.type === "UTENDORS" 
              ? "rgba(200, 255, 200, 0.5)"
              : "rgba(144, 238, 144, 0.5)"
          const color = isSelected
            ? "#dc2626"
            : spot.type === "UTENDORS" 
              ? "#10b981"
              : "#7CB342"
          
          existingRect.setStyle({
            color: color,
            fillColor: fillColor,
            fillOpacity: isSelected ? 0.6 : 0.5,
            weight: isSelected ? 4 : 3,
          })
        } else {
          // Lag ny rektangel
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

          const isSelected = selectedSpotId === spot.id
          const fillColor = isSelected
            ? "rgba(239, 68, 68, 0.6)"
            : spot.type === "UTENDORS" 
              ? "rgba(200, 255, 200, 0.5)"
              : "rgba(144, 238, 144, 0.5)"
          const color = isSelected
            ? "#dc2626"
            : spot.type === "UTENDORS" 
              ? "#10b981"
              : "#7CB342"

          const rectangle = L.rectangle(rectBounds, {
            color: color,
            fillColor: fillColor,
            fillOpacity: isSelected ? 0.6 : 0.5,
            weight: isSelected ? 4 : 3,
            interactive: true,
          })
            .addTo(map)
            // Ikke bind popup - det kan forhindre klikk

          // Gjør rektangel klikkbar - én klikk skal være nok
          rectangle.on("click", (e) => {
            e.originalEvent.stopPropagation()
            e.originalEvent.preventDefault()
            onMarkerClick(spot.id)
          })
          
          // Hover-effekt med popup
          rectangle.on("mouseover", function(this: L.Rectangle) {
            if (selectedSpotId !== spot.id) {
              this.setStyle({
                weight: 4,
                fillOpacity: 0.7,
              })
            }
            if (map) {
              map.getContainer().style.cursor = "pointer"
            }
            // Vis popup på hover
            const popup = L.popup().setContent(getPopupContent(spot))
            this.bindPopup(popup).openPopup()
          })
          
          rectangle.on("mouseout", function(this: L.Rectangle) {
            const currentIsSelected = selectedSpotId === spot.id
            this.setStyle({
              weight: currentIsSelected ? 4 : 3,
              fillOpacity: currentIsSelected ? 0.6 : 0.5,
            })
            if (map) {
              map.getContainer().style.cursor = ""
            }
          })

          rectanglesMapRef.current[spot.id] = rectangle
          rectanglesRef.current.push(rectangle)
        }
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
        // Sjekk om markør allerede eksisterer
        const existingMarker = markersMapRef.current[spot.id]
        
        if (existingMarker) {
          // Oppdater bare ikonet, ikke lag ny markør
          const isSelected = selectedSpotId === spot.id
          const iconBackground = isSelected
            ? "background: #dc2626;"
            : "background: linear-gradient(to bottom right, #2563eb, #16a34a);"
          const iconBorder = isSelected
            ? "border: 4px solid white;"
            : "border: 3px solid white;"
          
          const customIcon = L.divIcon({
            className: "parking-marker",
            html: `<div style="width: 40px; height: 40px; border-radius: 50%; ${iconBackground} ${iconBorder} box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; cursor: pointer;">P</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })
          
          existingMarker.setIcon(customIcon)
        } else {
          // Lag ny markør
          const isSelected = selectedSpotId === spot.id
          const iconBackground = isSelected
            ? "background: #dc2626;" // Rød når valgt
            : "background: linear-gradient(to bottom right, #2563eb, #16a34a);" // Standard gradient
          const iconBorder = isSelected
            ? "border: 4px solid white;" // Tykkere border når valgt
            : "border: 3px solid white;"
          
          // Gjør ikonet større (40px i stedet for 30px) for bedre synlighet og klikkbarhet
          const customIcon = L.divIcon({
            className: "parking-marker",
            html: `<div style="width: 40px; height: 40px; border-radius: 50%; ${iconBackground} ${iconBorder} box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; cursor: pointer;">P</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })

          const marker = L.marker([spot.latitude, spot.longitude], { 
            icon: customIcon,
            interactive: true,
            zIndexOffset: isSelected ? 1000 : 0, // Høyere z-index når valgt
          })
            .addTo(map)
            // Ikke bind popup - det kan forhindre klikk

          // Gjør markør klikkbar - én klikk skal være nok
          marker.on("click", (e) => {
            e.originalEvent.stopPropagation()
            e.originalEvent.preventDefault()
            onMarkerClick(spot.id)
          })
          
          // Hover-effekt med popup
          marker.on("mouseover", function(this: L.Marker) {
            if (map) {
              map.getContainer().style.cursor = "pointer"
            }
            // Vis popup på hover
            const popup = L.popup().setContent(getPopupContent(spot))
            this.bindPopup(popup).openPopup()
          })
          
          marker.on("mouseout", function(this: L.Marker) {
            if (map) {
              map.getContainer().style.cursor = ""
            }
          })
          
          markersMapRef.current[spot.id] = marker
          markersRef.current.push(marker)
        }
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
  }, [parkingSpots, userLocation, onMarkerClick, onBoundsChange, renderKey, selectedSpotId])

  return <div ref={mapContainerRef} className="h-full w-full" />
}

