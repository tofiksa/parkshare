import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import puppeteer from "puppeteer"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

// Haversine formula for å beregne avstand mellom to koordinater
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function POST(request: Request) {
  let browser: any = null
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { parkingSpotId, latitude, longitude, rectCorner1Lat, rectCorner1Lng, rectCorner2Lat, rectCorner2Lng, rectCorner3Lat, rectCorner3Lng, rectCorner4Lat, rectCorner4Lng } = body

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude og longitude er påkrevd" },
        { status: 400 }
      )
    }

    // Hent alle parkeringsplasser innenfor 50 meter radius
    // Bruk grov bounding box først for å redusere antall queries
    const radiusInDegrees = 0.05 / 111 // Omtrentlig konvertering (1 grad ≈ 111 km)
    const latRange = radiusInDegrees * 1.5 // Litt større for å sikre vi får alle
    const lngRange = radiusInDegrees * 1.5 / Math.cos((latitude * Math.PI) / 180)

    const allSpots = await prisma.parkingSpot.findMany({
      where: {
        isActive: true,
        latitude: { 
          gte: latitude - latRange,
          lte: latitude + latRange,
        },
        longitude: {
          gte: longitude - lngRange,
          lte: longitude + lngRange,
        },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        rectCorner1Lat: true,
        rectCorner1Lng: true,
        rectCorner2Lat: true,
        rectCorner2Lng: true,
        rectCorner3Lat: true,
        rectCorner3Lng: true,
        rectCorner4Lat: true,
        rectCorner4Lng: true,
      },
    })

    // Filtrer plasser innenfor nøyaktig 50 meter (0.05 km)
    const nearbySpots = allSpots.filter((spot) => {
      if (!spot.latitude || !spot.longitude) return false
      const distance = calculateDistance(latitude, longitude, spot.latitude, spot.longitude)
      return distance <= 0.05 // 50 meter
    })

    // Beregn senter og zoom for kartet
    const centerLat = latitude
    const centerLng = longitude
    const zoom = 18 // Høy zoom for detaljert visning (50 meter radius)

    // Bygg HTML for kartet
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Parking Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 800px; height: 600px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([${centerLat}, ${centerLng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const nearbySpots = ${JSON.stringify(nearbySpots)};
    const currentSpotId = '${parkingSpotId || 'current'}';
    const currentSpot = {
      id: currentSpotId,
      rectCorner1Lat: ${rectCorner1Lat || 'null'},
      rectCorner1Lng: ${rectCorner1Lng || 'null'},
      rectCorner2Lat: ${rectCorner2Lat || 'null'},
      rectCorner2Lng: ${rectCorner2Lng || 'null'},
      rectCorner3Lat: ${rectCorner3Lat || 'null'},
      rectCorner3Lng: ${rectCorner3Lng || 'null'},
      rectCorner4Lat: ${rectCorner4Lat || 'null'},
      rectCorner4Lng: ${rectCorner4Lng || 'null'},
    };

    // Tegn alle parkeringsplasser (andre plasser først, så aktuell plass på toppen)
    nearbySpots.forEach(spot => {
      if (spot.rectCorner1Lat && spot.rectCorner1Lng && 
          spot.rectCorner2Lat && spot.rectCorner2Lng &&
          spot.rectCorner3Lat && spot.rectCorner3Lng &&
          spot.rectCorner4Lat && spot.rectCorner4Lng) {
        const isCurrent = spot.id === currentSpotId;
        const polygonCoords = [
          [spot.rectCorner1Lat, spot.rectCorner1Lng],
          [spot.rectCorner2Lat, spot.rectCorner2Lng],
          [spot.rectCorner3Lat, spot.rectCorner3Lng],
          [spot.rectCorner4Lat, spot.rectCorner4Lng],
        ];
        
        // Hopp over aktuell plass her, den tegnes etterpå
        if (!isCurrent) {
          L.polygon(polygonCoords, {
            color: '#6b7280',
            fillColor: 'rgba(107, 114, 128, 0.4)',
            fillOpacity: 0.4,
            weight: 2,
          }).addTo(map);
        }
      }
    });

    // Tegn aktuell parkeringsplass på toppen (rød farge)
    if (currentSpot.rectCorner1Lat && currentSpot.rectCorner1Lng &&
        currentSpot.rectCorner2Lat && currentSpot.rectCorner2Lng &&
        currentSpot.rectCorner3Lat && currentSpot.rectCorner3Lng &&
        currentSpot.rectCorner4Lat && currentSpot.rectCorner4Lng) {
      const currentPolygonCoords = [
        [currentSpot.rectCorner1Lat, currentSpot.rectCorner1Lng],
        [currentSpot.rectCorner2Lat, currentSpot.rectCorner2Lng],
        [currentSpot.rectCorner3Lat, currentSpot.rectCorner3Lng],
        [currentSpot.rectCorner4Lat, currentSpot.rectCorner4Lng],
      ];
      
      L.polygon(currentPolygonCoords, {
        color: '#dc2626',
        fillColor: 'rgba(239, 68, 68, 0.6)',
        fillOpacity: 0.6,
        weight: 4,
      }).addTo(map);
    }

    // Vent til kartet er lastet
    setTimeout(() => {
      window.mapReady = true;
    }, 2000);
  </script>
</body>
</html>
    `

    // Start Puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 800, height: 600 })
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

    // Vent til kartet er klar
    await page.waitForFunction(() => (window as any).mapReady, { timeout: 10000 })

    // Ta screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    })

    await browser.close()

    // Konverter til base64 data URL
    const base64 = (screenshot as Buffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    return NextResponse.json({
      url: dataUrl,
      type: 'image/png',
    })
  } catch (error) {
    if (browser) {
      await browser.close()
    }
    logger.error("Error generating map image", error, { parkingSpotId: params.id })
    return NextResponse.json(
      { error: "Kunne ikke generere kartbilde" },
      { status: 500 }
    )
  }
}

