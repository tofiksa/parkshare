"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface ExistingParkingSpot {
  id: string
  address: string
  type?: "UTENDORS" | "INNENDORS"
  rectCorner1Lat?: number | null
  rectCorner1Lng?: number | null
  rectCorner2Lat?: number | null
  rectCorner2Lng?: number | null
  rectCorner3Lat?: number | null
  rectCorner3Lng?: number | null
  rectCorner4Lat?: number | null
  rectCorner4Lng?: number | null
}

interface ParkingSpotDrawMapProps {
  center?: { lat: number; lng: number }
  onPolygonDrawn: (corners: {
    rectCorner1Lat: number
    rectCorner1Lng: number
    rectCorner2Lat: number
    rectCorner2Lng: number
    rectCorner3Lat: number
    rectCorner3Lng: number
    rectCorner4Lat: number
    rectCorner4Lng: number
    centerLat: number
    centerLng: number
  }) => void
  onVertexAdded?: (vertexIndex: number, lat: number, lng: number) => void
  initialPolygon?: {
    rectCorner1Lat: number
    rectCorner1Lng: number
    rectCorner2Lat: number
    rectCorner2Lng: number
    rectCorner3Lat: number
    rectCorner3Lng: number
    rectCorner4Lat: number
    rectCorner4Lng: number
  } | null
  polygonFromInput?: {
    rectCorner1Lat: number
    rectCorner1Lng: number
    rectCorner2Lat: number
    rectCorner2Lng: number
    rectCorner3Lat: number
    rectCorner3Lng: number
    rectCorner4Lat: number
    rectCorner4Lng: number
  } | null
  existingParkingSpots?: ExistingParkingSpot[]
}

export default function ParkingSpotDrawMap({
  center,
  onPolygonDrawn,
  initialPolygon,
  polygonFromInput,
  onVertexAdded,
  existingParkingSpots = [],
}: ParkingSpotDrawMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const drawnPolygonRef = useRef<L.Polygon | null>(null)
  const editableLayersRef = useRef<L.FeatureGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const existingPolygonsRef = useRef<L.Polygon[]>([])
  
  // State for custom polygon drawing
  const [isDrawing, setIsDrawing] = useState(false)
  const verticesRef = useRef<L.LatLng[]>([])
  const markersRef = useRef<L.Marker[]>([])
  const tempPolylineRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Initialize map
    if (!mapRef.current) {
      const defaultCenter: [number, number] = center
        ? [center.lat, center.lng]
        : [59.9139, 10.7522] // Default to Oslo

      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
      }).setView(defaultCenter, 18)
      
      // Force map to invalidate size after a short delay to ensure container is rendered
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize()
        }
      }, 100)

      // Add tile layer and store in ref
        const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          maxNativeZoom: 19, // Prevent requesting tiles beyond what server supports
        })
      tileLayer.addTo(mapRef.current)
      tileLayerRef.current = tileLayer

      // Create editable layers group
      const editableLayers = new L.FeatureGroup()
      editableLayersRef.current = editableLayers
      mapRef.current.addLayer(editableLayers)

      // Custom map click handler for polygon drawing will be set up in separate useEffect
    } else if (center && mapRef.current) {
      // Update map center when center prop changes
      const newCenter: [number, number] = [center.lat, center.lng]
      mapRef.current.setView(newCenter, 18, { animate: true, duration: 0.5 })
    }

    // Load initial polygon if provided
    if (mapRef.current && initialPolygon && !drawnPolygonRef.current) {
      const polygonCoords: [number, number][] = [
        [initialPolygon.rectCorner1Lat, initialPolygon.rectCorner1Lng],
        [initialPolygon.rectCorner2Lat, initialPolygon.rectCorner2Lng],
        [initialPolygon.rectCorner3Lat, initialPolygon.rectCorner3Lng],
        [initialPolygon.rectCorner4Lat, initialPolygon.rectCorner4Lng],
        [initialPolygon.rectCorner1Lat, initialPolygon.rectCorner1Lng], // Close polygon
      ]

      const polygon = L.polygon(polygonCoords, {
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.3,
        weight: 3,
      })

      if (editableLayersRef.current) {
        editableLayersRef.current.addLayer(polygon)
      } else if (mapRef.current) {
        mapRef.current.addLayer(polygon)
      }

      drawnPolygonRef.current = polygon
    }

    // Update polygon from input fields
    if (mapRef.current && polygonFromInput && editableLayersRef.current) {
      // Remove existing polygon
      if (drawnPolygonRef.current && editableLayersRef.current) {
        editableLayersRef.current.removeLayer(drawnPolygonRef.current)
      }

      const polygonCoords: [number, number][] = [
        [polygonFromInput.rectCorner1Lat, polygonFromInput.rectCorner1Lng],
        [polygonFromInput.rectCorner2Lat, polygonFromInput.rectCorner2Lng],
        [polygonFromInput.rectCorner3Lat, polygonFromInput.rectCorner3Lng],
        [polygonFromInput.rectCorner4Lat, polygonFromInput.rectCorner4Lng],
        [polygonFromInput.rectCorner1Lat, polygonFromInput.rectCorner1Lng], // Close polygon
      ]

      const polygon = L.polygon(polygonCoords, {
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.3,
        weight: 3,
      })

      editableLayersRef.current.addLayer(polygon)
      drawnPolygonRef.current = polygon
    }

  }, [center, initialPolygon, polygonFromInput, existingParkingSpots])

  // Update existing parking spots when they change
  useEffect(() => {
    if (!mapRef.current) return

    // Remove old existing polygons
    existingPolygonsRef.current.forEach((polygon) => {
      mapRef.current?.removeLayer(polygon)
    })
    existingPolygonsRef.current = []

    // Add new existing parking spots
    if (existingParkingSpots && existingParkingSpots.length > 0) {
      existingParkingSpots.forEach((spot) => {
        if (
          spot.rectCorner1Lat &&
          spot.rectCorner1Lng &&
          spot.rectCorner2Lat &&
          spot.rectCorner2Lng &&
          spot.rectCorner3Lat &&
          spot.rectCorner3Lng &&
          spot.rectCorner4Lat &&
          spot.rectCorner4Lng
        ) {
          const polygonCoords: [number, number][] = [
            [spot.rectCorner1Lat, spot.rectCorner1Lng],
            [spot.rectCorner2Lat, spot.rectCorner2Lng],
            [spot.rectCorner3Lat, spot.rectCorner3Lng],
            [spot.rectCorner4Lat, spot.rectCorner4Lng],
            [spot.rectCorner1Lat, spot.rectCorner1Lng], // Close polygon
          ]

          // Use same colors as booking map based on type
          const fillColor = spot.type === "INNENDORS"
            ? "rgba(144, 238, 144, 0.5)"
            : "rgba(200, 255, 200, 0.5)"
          const color = spot.type === "INNENDORS"
            ? "#7CB342"
            : "#10b981"

          const existingPolygon = L.polygon(polygonCoords, {
            color: color,
            fillColor: fillColor,
            fillOpacity: 0.5,
            weight: 3,
            interactive: false, // Make them non-interactive
          })

          existingPolygon.bindTooltip(spot.address || "Eksisterende parkering", {
            permanent: false,
            direction: "top",
          })

          existingPolygonsRef.current.push(existingPolygon)
          if (mapRef.current) {
            mapRef.current.addLayer(existingPolygon)
          }
        }
      })
    }
  }, [existingParkingSpots])

  // Check if new polygon overlaps with existing parking spots
  const checkOverlapWithExisting = useCallback((vertices: L.LatLng[]): boolean => {
    if (vertices.length < 4 || existingParkingSpots.length === 0) return false

    // Helper function to check if a point is inside a polygon (ray casting algorithm)
    const isPointInPolygon = (point: L.LatLng, polygon: L.LatLng[]): boolean => {
      let inside = false
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng
        const yi = polygon[i].lat
        const xj = polygon[j].lng
        const yj = polygon[j].lat

        const intersect = 
          ((yi > point.lat) !== (yj > point.lat)) &&
          (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)
        
        if (intersect) inside = !inside
      }
      return inside
    }

    // Helper function to check if two line segments intersect
    const doSegmentsIntersect = (
      p1: L.LatLng, p2: L.LatLng,
      p3: L.LatLng, p4: L.LatLng
    ): boolean => {
      const orientation = (p: L.LatLng, q: L.LatLng, r: L.LatLng): number => {
        const val = (q.lng - p.lng) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lng - q.lng)
        if (val === 0) return 0
        return val > 0 ? 1 : 2
      }

      const o1 = orientation(p1, p2, p3)
      const o2 = orientation(p1, p2, p4)
      const o3 = orientation(p3, p4, p1)
      const o4 = orientation(p3, p4, p2)

      if (o1 !== o2 && o3 !== o4) return true
      return false
    }

    // Check each existing parking spot
    for (const spot of existingParkingSpots) {
      if (
        !spot.rectCorner1Lat || !spot.rectCorner1Lng ||
        !spot.rectCorner2Lat || !spot.rectCorner2Lng ||
        !spot.rectCorner3Lat || !spot.rectCorner3Lng ||
        !spot.rectCorner4Lat || !spot.rectCorner4Lng
      ) {
        continue
      }

      const existingPolygon = [
        L.latLng(spot.rectCorner1Lat, spot.rectCorner1Lng),
        L.latLng(spot.rectCorner2Lat, spot.rectCorner2Lng),
        L.latLng(spot.rectCorner3Lat, spot.rectCorner3Lng),
        L.latLng(spot.rectCorner4Lat, spot.rectCorner4Lng),
      ]

      // Check if any vertex of the new polygon is inside an existing polygon
      for (const vertex of vertices) {
        if (isPointInPolygon(vertex, existingPolygon)) {
          return true
        }
      }

      // Check if any vertex of existing polygon is inside the new polygon
      for (const existingVertex of existingPolygon) {
        if (isPointInPolygon(existingVertex, vertices)) {
          return true
        }
      }

      // Check if any edges intersect
      for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i]
        const p2 = vertices[(i + 1) % vertices.length]

        for (let j = 0; j < existingPolygon.length; j++) {
          const p3 = existingPolygon[j]
          const p4 = existingPolygon[(j + 1) % existingPolygon.length]

          if (doSegmentsIntersect(p1, p2, p3, p4)) {
            return true
          }
        }
      }
    }

    return false
  }, [existingParkingSpots])

  // Check if polygon edges intersect (self-intersecting)
  const checkSelfIntersection = useCallback((vertices: L.LatLng[]): boolean => {
    if (vertices.length < 4) return false

    // Helper function to check if two line segments intersect
    const doSegmentsIntersect = (
      p1: L.LatLng, p2: L.LatLng,
      p3: L.LatLng, p4: L.LatLng
    ): boolean => {
      // Check if segments share an endpoint (adjacent edges)
      if (
        (p1.equals(p3) || p1.equals(p4) || p2.equals(p3) || p2.equals(p4))
      ) {
        return false // Adjacent edges don't count as intersection
      }

      // Calculate orientation
      const orientation = (p: L.LatLng, q: L.LatLng, r: L.LatLng): number => {
        const val = (q.lng - p.lng) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lng - q.lng)
        if (val === 0) return 0 // Collinear
        return val > 0 ? 1 : 2 // Clockwise or counterclockwise
      }

      const o1 = orientation(p1, p2, p3)
      const o2 = orientation(p1, p2, p4)
      const o3 = orientation(p3, p4, p1)
      const o4 = orientation(p3, p4, p2)

      // General case: segments intersect if orientations are different
      if (o1 !== o2 && o3 !== o4) return true

      return false
    }

    // Check all non-adjacent edges for intersection
    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i]
      const p2 = vertices[(i + 1) % vertices.length]

      // Check against all other non-adjacent edges
      for (let j = i + 2; j < vertices.length; j++) {
        // Skip the last edge if checking the first vertex (to avoid checking closing edge twice)
        if (i === 0 && j === vertices.length - 1) continue

        const p3 = vertices[j]
        const p4 = vertices[(j + 1) % vertices.length]

        if (doSegmentsIntersect(p1, p2, p3, p4)) {
          return true
        }
      }
    }

    return false
  }, [])

  const updateTempPolyline = useCallback(() => {
    const vertices = verticesRef.current

    // Remove existing temp polyline
    if (tempPolylineRef.current && mapRef.current) {
      mapRef.current.removeLayer(tempPolylineRef.current)
    }

    if (vertices.length > 1) {
      const polylineCoords = vertices.map((v) => [v.lat, v.lng] as [number, number])
      
      // If we have 4 vertices, close the polyline
      if (vertices.length === 4) {
        polylineCoords.push([vertices[0].lat, vertices[0].lng] as [number, number])
      }

      // Change color if self-intersecting or overlapping with existing spots
      const isSelfIntersecting = vertices.length === 4 && checkSelfIntersection(vertices)
      const isOverlapping = vertices.length === 4 && checkOverlapWithExisting(vertices)
      const color = (isSelfIntersecting || isOverlapping) ? "#ef4444" : "#10b981" // Red if intersecting or overlapping, green otherwise

      const polyline = L.polyline(polylineCoords, {
        color,
        weight: 2,
        dashArray: "5, 5",
        opacity: 0.7,
      })

      if (mapRef.current) {
        polyline.addTo(mapRef.current)
        tempPolylineRef.current = polyline
      }
    }
  }, [checkSelfIntersection, checkOverlapWithExisting])

  const clearDrawing = useCallback(() => {
    // Remove markers
    markersRef.current.forEach((marker) => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker)
      }
    })
    markersRef.current = []

    // Remove temp polyline
    if (tempPolylineRef.current && mapRef.current) {
      mapRef.current.removeLayer(tempPolylineRef.current)
      tempPolylineRef.current = null
    }

    // Clear vertices
    verticesRef.current = []
    
    // Ensure tile layer is still visible (don't remove it)
    if (mapRef.current && tileLayerRef.current) {
      if (!mapRef.current.hasLayer(tileLayerRef.current)) {
        tileLayerRef.current.addTo(mapRef.current)
      }
    }
  }, [])

  const completePolygon = useCallback(() => {
    const vertices = verticesRef.current

    if (vertices.length !== 4) {
      alert("Parkeringsplassen må ha nøyaktig 4 hjørnepunkter.")
      return
    }

    // Check for overlap with existing parking spots
    if (checkOverlapWithExisting(vertices)) {
      alert("Du kan ikke tegne en parkeringsplass over en eksisterende parkeringsplass. Vennligst velg et annet område.")
      return
    }

    // Remove temp polyline
    if (tempPolylineRef.current && mapRef.current) {
      mapRef.current.removeLayer(tempPolylineRef.current)
      tempPolylineRef.current = null
    }

    // Create polygon
    const polygonCoords: [number, number][] = [
      [vertices[0].lat, vertices[0].lng],
      [vertices[1].lat, vertices[1].lng],
      [vertices[2].lat, vertices[2].lng],
      [vertices[3].lat, vertices[3].lng],
      [vertices[0].lat, vertices[0].lng], // Close polygon
    ]

    const polygon = L.polygon(polygonCoords, {
      color: "#10b981",
      fillColor: "#10b981",
      fillOpacity: 0.3,
      weight: 3,
    })

    // Remove previous polygon
    if (drawnPolygonRef.current && editableLayersRef.current) {
      editableLayersRef.current.removeLayer(drawnPolygonRef.current)
    }

    // Add new polygon
    if (editableLayersRef.current) {
      editableLayersRef.current.addLayer(polygon)
    } else if (mapRef.current) {
      mapRef.current.addLayer(polygon)
    }

    drawnPolygonRef.current = polygon

    // Calculate center point
    let centerLat = 0
    let centerLng = 0
    vertices.forEach((v) => {
      centerLat += v.lat
      centerLng += v.lng
    })
    centerLat /= vertices.length
    centerLng /= vertices.length

    // Call callback
    onPolygonDrawn({
      rectCorner1Lat: vertices[0].lat,
      rectCorner1Lng: vertices[0].lng,
      rectCorner2Lat: vertices[1].lat,
      rectCorner2Lng: vertices[1].lng,
      rectCorner3Lat: vertices[2].lat,
      rectCorner3Lng: vertices[2].lng,
      rectCorner4Lat: vertices[3].lat,
      rectCorner4Lng: vertices[3].lng,
      centerLat,
      centerLng,
    })

    // Reset drawing state
    setIsDrawing(false)
    clearDrawing()
  }, [onPolygonDrawn, clearDrawing, checkOverlapWithExisting])

  const createDraggableMarker = useCallback((latlng: L.LatLng, vertexIndex: number) => {
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: "custom-vertex-marker",
        html: `<div style="
          width: 16px;
          height: 16px;
          background-color: #10b981;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: move;
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      draggable: true,
    })

    // Handle drag end to update vertex position
    marker.on("dragend", (e) => {
      const newLatLng = marker.getLatLng()
      const vertices = verticesRef.current
      
      if (vertexIndex >= 0 && vertexIndex < vertices.length) {
        vertices[vertexIndex] = newLatLng
        // Update temp polyline
        updateTempPolyline()
        
        // Notify parent component
        if (onVertexAdded) {
          onVertexAdded(vertexIndex, newLatLng.lat, newLatLng.lng)
        }
      }
    })

    return marker
  }, [updateTempPolyline, onVertexAdded])

  const addVertex = useCallback((latlng: L.LatLng) => {
    const vertices = verticesRef.current
    
    // Don't add more than 4 vertices
    if (vertices.length >= 4) {
      return
    }
    
    vertices.push(latlng)

    // Add draggable marker for the vertex
    const vertexIndex = vertices.length - 1
    const marker = createDraggableMarker(latlng, vertexIndex)

    if (mapRef.current) {
      marker.addTo(mapRef.current)
      markersRef.current.push(marker)
    }

    // Update temp polyline
    updateTempPolyline()

    // Notify parent component
    if (onVertexAdded) {
      onVertexAdded(vertexIndex, latlng.lat, latlng.lng)
    }

    // If we have 4 vertices, complete the polygon
    if (vertices.length === 4) {
      completePolygon()
    }
  }, [onVertexAdded, updateTempPolyline, completePolygon, createDraggableMarker])

  const startDrawing = useCallback(() => {
    // If there's an existing polygon, extract its vertices for editing
    if (drawnPolygonRef.current) {
      const polygon = drawnPolygonRef.current
      const latlngs = polygon.getLatLngs()[0] as L.LatLng[]
      
      if (latlngs && latlngs.length >= 4) {
        // Extract the 4 corners (ignore the closing point if present)
        const corners = latlngs.slice(0, 4)
        verticesRef.current = corners
        
        // Add draggable markers for existing vertices
        corners.forEach((latlng, index) => {
          const marker = createDraggableMarker(latlng, index)
          
          if (mapRef.current) {
            marker.addTo(mapRef.current)
            markersRef.current.push(marker)
          }
        })
        
        // Create temp polyline to show existing polygon
        const polylineCoords = corners.map((v) => [v.lat, v.lng] as [number, number])
        polylineCoords.push([corners[0].lat, corners[0].lng] as [number, number]) // Close
        
        const polyline = L.polyline(polylineCoords, {
          color: "#10b981",
          weight: 2,
          dashArray: "5, 5",
          opacity: 0.7,
        })
        
        if (mapRef.current) {
          polyline.addTo(mapRef.current)
          tempPolylineRef.current = polyline
        }
      }
      
      // Remove existing polygon so user can redraw
      if (editableLayersRef.current) {
        editableLayersRef.current.removeLayer(drawnPolygonRef.current)
      }
      drawnPolygonRef.current = null
    } else {
      // Start fresh drawing
      verticesRef.current = []
    }

    // Ensure map is still visible and valid BEFORE setting state
    if (mapRef.current) {
      // Check if map container is still in DOM
      const container = mapRef.current.getContainer()
      if (!container || !container.parentElement) {
        return // Don't proceed if container is not in DOM
      }
      
      // Ensure tile layer is present and visible BEFORE state change
      if (!tileLayerRef.current) {
        const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          maxNativeZoom: 19, // Prevent requesting tiles beyond what server supports
        })
        tileLayer.addTo(mapRef.current)
        tileLayerRef.current = tileLayer
      } else {
        // Check if tile layer is still on the map
        if (!mapRef.current.hasLayer(tileLayerRef.current)) {
          tileLayerRef.current.addTo(mapRef.current)
        }
      }
    } else {
      return
    }
    
    // Set drawing state AFTER ensuring map is ready
    setIsDrawing(true)
    
    // Force map refresh after state change - but be careful with high zoom levels
    setTimeout(() => {
      if (mapRef.current && tileLayerRef.current) {
        const currentZoom = mapRef.current.getZoom()
        const center = mapRef.current.getCenter()
        
        // Don't use setView if zoom is very high (can cause tile loading issues)
        // Just invalidate size and redraw tiles
        mapRef.current.invalidateSize()
        
        // Only redraw tiles, don't reload them
        tileLayerRef.current.redraw()
        
        // If zoom is too high, ensure we're within maxZoom
        if (currentZoom > 19) {
          mapRef.current.setZoom(19)
        }
      }
    }, 50)
  }, [createDraggableMarker])

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false)
    clearDrawing()
  }, [clearDrawing])

  // Handle map clicks for drawing and update cursor
  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    // Update cursor style on map container - use CSS class instead of inline style
    const mapContainer = mapRef.current.getContainer()
    if (mapContainer) {
      // Remove any existing cursor classes
      mapContainer.classList.remove('cursor-crosshair')
      
      if (isDrawing) {
        // Add CSS class instead of inline style
        mapContainer.classList.add('cursor-crosshair')
      }
      
      // Don't invalidate size here as it might cause rendering issues
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawing) {
        return
      }

      const latlng = e.latlng
      const vertices = verticesRef.current

      // If we have 4 vertices, check if clicking near first point to complete
      if (vertices.length === 4) {
        const firstPoint = vertices[0]
        const distance = mapRef.current!.distance(firstPoint, latlng)
        
        if (distance < 10) {
          // Complete the polygon
          completePolygon()
          return
        }
      }

       // Add new vertex if we have less than 4
       // Only prevent adding if clicking directly on a marker (very small tolerance)
       const clickedOnMarker = markersRef.current.some((marker) => {
         const markerPos = marker.getLatLng()
         const distance = mapRef.current!.distance(markerPos, latlng)
         return distance < 1 // 1 meter tolerance - only prevent if clicking directly on marker
       })
       
       if (!clickedOnMarker && vertices.length < 4) {
         addVertex(latlng)
       }
    }

    mapRef.current.on("click", handleMapClick)
    
    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", handleMapClick)
        // Reset cursor class
        const mapContainer = mapRef.current.getContainer()
        if (mapContainer) {
          mapContainer.classList.remove('cursor-crosshair')
        }
      }
    }
  }, [isDrawing, addVertex, completePolygon])

  return (
    <div className="relative w-full h-96" style={{ isolation: 'isolate' }}>
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{ position: 'relative', zIndex: 0 }}
      />
      
      {/* Drawing controls - positioned at bottom-left to avoid zoom controls (which are top-right) */}
      <div className="absolute bottom-4 left-4 z-[1000] flex gap-2">
        {!isDrawing ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              startDrawing()
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-lg font-medium"
          >
            {drawnPolygonRef.current ? "✏️ Rediger tegning" : "🎨 Start tegning"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                completePolygon()
              }}
              disabled={
                verticesRef.current.length < 4 || 
                (verticesRef.current.length === 4 && (
                  checkSelfIntersection(verticesRef.current) || 
                  checkOverlapWithExisting(verticesRef.current)
                ))
              }
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded shadow-lg font-medium"
            >
              ✅ Fullfør ({verticesRef.current.length}/4)
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                cancelDrawing()
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-lg font-medium"
            >
              ❌ Avbryt
            </button>
          </>
        )}
      </div>

      {/* Instructions - positioned at bottom-right when drawing */}
      {isDrawing && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white bg-opacity-90 px-4 py-2 rounded shadow-lg text-sm border border-gray-200">
          <p className="font-medium">Klikk på kartet for å legge til hjørnepunkter</p>
          <p>Du har lagt til {verticesRef.current.length} av 4 punkter</p>
        </div>
      )}
    </div>
  )
}
