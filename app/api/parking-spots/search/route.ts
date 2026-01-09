import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const searchSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  maxPrice: z.number().optional(),
  type: z.enum(["UTENDORS", "INNENDORS"]).optional(),
  maxDistance: z.number().optional(), // i kilometer
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
    
    // Håndter tom streng/null for type
    const typeParam = searchParams.get("type")
    const typeValue = typeParam && typeParam !== "" ? (typeParam as "UTENDORS" | "INNENDORS") : undefined
    
    const query = {
      latitude: searchParams.get("latitude") ? parseFloat(searchParams.get("latitude")!) : undefined,
      longitude: searchParams.get("longitude") ? parseFloat(searchParams.get("longitude")!) : undefined,
      startTime: searchParams.get("startTime") || undefined,
      endTime: searchParams.get("endTime") || undefined,
      maxPrice: searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined,
      type: typeValue,
      maxDistance: searchParams.get("maxDistance") ? parseFloat(searchParams.get("maxDistance")!) : undefined,
    }

    const validatedQuery = searchSchema.parse(query)

    // Hent alle aktive parkeringsplasser
    let parkingSpots = await prisma.parkingSpot.findMany({
      where: {
        isActive: true,
        supportsAdvanceBooking: true, // Kun plasser som støtter forhåndsbooking
        ...(validatedQuery.type && { type: validatedQuery.type }),
        ...(validatedQuery.maxPrice && { pricePerHour: { lte: validatedQuery.maxPrice } }),
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    // Filtrer på tilgjengelighet basert på bookinger
    if (validatedQuery.startTime && validatedQuery.endTime) {
      const startTime = new Date(validatedQuery.startTime)
      const endTime = new Date(validatedQuery.endTime)

      // Kun sjekk ADVANCE bookinger for tilgjengelighet
      // STARTED (ON_DEMAND) bookinger påvirker ikke ADVANCE søk
      const spotsWithBookings = await prisma.booking.findMany({
        where: {
          bookingType: "ADVANCE", // KUN ADVANCE bookinger
          status: {
            in: ["PENDING", "CONFIRMED", "ACTIVE"], // Ikke STARTED
          },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gte: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lte: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
        select: {
          parkingSpotId: true,
        },
      })

      const bookedSpotIds = new Set(spotsWithBookings.map((b) => b.parkingSpotId))
      parkingSpots = parkingSpots.filter((spot) => !bookedSpotIds.has(spot.id))
    }

    // Filtrer på avstand hvis koordinater OG maxDistance er gitt
    // Hvis kun koordinater er gitt uten maxDistance, vis alle plasser (men inkluder koordinater i response)
    if (validatedQuery.latitude && validatedQuery.longitude && validatedQuery.maxDistance) {
      parkingSpots = parkingSpots.filter((spot) => {
        if (!spot.latitude || !spot.longitude) return false

        const distance = calculateDistance(
          validatedQuery.latitude!,
          validatedQuery.longitude!,
          spot.latitude,
          spot.longitude
        )

        return distance <= validatedQuery.maxDistance!
      })
    }
    // Hvis ingen filtre er satt, returner alle aktive plasser
    // Dette sikrer at brukeren alltid ser noe når de åpner søkesiden

    return NextResponse.json(parkingSpots)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error searching parking spots", error)
    return NextResponse.json(
      { error: "Kunne ikke søke etter parkeringsplasser" },
      { status: 500 }
    )
  }
}

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

