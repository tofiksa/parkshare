import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const mapSearchSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().optional().default(1), // Default 1 km
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    if (session.user.userType !== "LEIETAKER") {
      return NextResponse.json(
        { error: "Kun leietakere kan søke etter parkeringsplasser" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const latitude = searchParams.get("latitude")
    const longitude = searchParams.get("longitude")
    const radius = searchParams.get("radius")

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude og longitude er påkrevd" },
        { status: 400 }
      )
    }

    const query = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: radius ? parseFloat(radius) : 1, // Default 1 km
    }

    const validatedQuery = mapSearchSchema.parse(query)

    // Hent alle aktive parkeringsplasser (både ADVANCE og ON_DEMAND)
    let parkingSpots
    try {
      // Hent alle felter inkludert rektangelfeltene
      // Inkluder alle aktive plasser som har koordinater (både ADVANCE og ON_DEMAND)
      parkingSpots = await (prisma.parkingSpot.findMany({
        where: {
          isActive: true,
          // Inkluder både plasser som støtter ADVANCE og/eller ON_DEMAND
          OR: [
            { supportsAdvanceBooking: true },
            { supportsOnDemandBooking: true },
          ],
          latitude: { not: null },
          longitude: { not: null },
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      }) as Promise<any[]>)
    } catch (prismaError) {
      console.error("Prisma error fetching parking spots:", prismaError)
      throw prismaError
    }

    // Beregn avstand for alle plasser og sorter etter avstand
    const userLocation = {
      latitude: validatedQuery.latitude,
      longitude: validatedQuery.longitude,
    }

    // Hjelpefunksjon for å beregne avstand
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
    
    // Sjekk tilgjengelighet (finn aktive ON_DEMAND bookinger)
    let activeBookings: Array<{ parkingSpotId: string }> = []
    try {
      activeBookings = await prisma.booking.findMany({
        where: {
          status: "STARTED",
          bookingType: "ON_DEMAND",
        },
        select: {
          parkingSpotId: true,
        },
      })
    } catch (prismaError) {
      console.error("Prisma error fetching active bookings:", prismaError)
      // Fortsett med tom liste hvis det feiler
      activeBookings = []
    }

    const bookedSpotIds = new Set(activeBookings.map((b) => b.parkingSpotId))

    // Formater og beregn avstand for alle plasser, sorter etter avstand
    // VIKTIG: Returnerer ALLE plasser, ikke filtrert etter radius
    // Alle aktive ON_DEMAND plasser vises, sortert etter avstand fra brukerens lokasjon
    
    const spotsWithDistance = (parkingSpots as any[])
      .filter((spot: any) => {
        // Sjekk at spot ikke er booket og har gyldige koordinater
        const isBooked = bookedSpotIds.has(spot.id)
        const hasValidCoords = spot.latitude !== null && 
                               spot.longitude !== null && 
                               typeof spot.latitude === "number" && 
                               typeof spot.longitude === "number" && 
                               !isNaN(spot.latitude) && 
                               !isNaN(spot.longitude)
        
        return !isBooked && hasValidCoords
      })
      .map((spot: any) => {
        // Sjekk at koordinatene er gyldige før beregning
        if (!spot.latitude || !spot.longitude) {
          console.warn("Spot", spot.id, "missing coordinates in map function")
          return null
        }
        
        try {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            spot.latitude,
            spot.longitude
          )
        
        return {
          id: spot.id,
          zoneNumber: spot.zoneNumber,
          zoneName: spot.zoneName,
          address: spot.address,
          latitude: spot.latitude,
          longitude: spot.longitude,
          pricePerHour: spot.pricePerHour,
          pricePerMinute: spot.pricePerMinute || (spot.pricePerHour ? spot.pricePerHour / 60 : 0),
          operator: spot.operator,
          type: spot.type,
          isAvailable: true,
          distance, // Legg til avstand i response
          // Rektangel-koordinater (for bakoverkompatibilitet)
          rectNorthLat: spot.rectNorthLat ?? null,
          rectSouthLat: spot.rectSouthLat ?? null,
          rectEastLng: spot.rectEastLng ?? null,
          rectWestLng: spot.rectWestLng ?? null,
          rectWidthMeters: spot.rectWidthMeters ?? null,
          rectHeightMeters: spot.rectHeightMeters ?? null,
          // Polygon-koordinater for roterte rektangler
          rectCorner1Lat: spot.rectCorner1Lat ?? null,
          rectCorner1Lng: spot.rectCorner1Lng ?? null,
          rectCorner2Lat: spot.rectCorner2Lat ?? null,
          rectCorner2Lng: spot.rectCorner2Lng ?? null,
          rectCorner3Lat: spot.rectCorner3Lat ?? null,
          rectCorner3Lng: spot.rectCorner3Lng ?? null,
          rectCorner4Lat: spot.rectCorner4Lat ?? null,
          rectCorner4Lng: spot.rectCorner4Lng ?? null,
        }
        } catch (calcError) {
          console.error("Error calculating distance for spot", spot.id, ":", calcError)
          return null
        }
      })
      .filter((spot): spot is NonNullable<typeof spot> => spot !== null) // Fjern null-verdier
      .sort((a, b) => a.distance - b.distance) // Sorter etter avstand (nærmest først)
    
    // Returner alle plasser sortert etter avstand (ikke filtrert etter radius)
    // Alle aktive ON_DEMAND plasser vises, sortert etter avstand fra brukerens lokasjon
    return NextResponse.json({
      parkingSpots: spotsWithDistance,
      userLocation: {
        latitude: validatedQuery.latitude,
        longitude: validatedQuery.longitude,
      },
    })
  } catch (error) {
    console.error("=== ERROR IN /api/parking-spots/map ===")
    console.error("Error type:", error?.constructor?.name)
    
    if (error instanceof z.ZodError) {
      console.error("Validation error in map search:", error.errors)
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error fetching parking spots for map:", error)
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    } else {
      console.error("Unknown error type:", error)
    }
    
    return NextResponse.json(
      { 
        error: "Kunne ikke hente parkeringsplasser",
        details: error instanceof Error ? error.message : "Ukjent feil"
      },
      { status: 500 }
    )
  }
}

