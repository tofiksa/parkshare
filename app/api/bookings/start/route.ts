import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isWithinTolerance } from "@/lib/gps"
import { z } from "zod"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const startBookingSchema = z.object({
  parkingSpotId: z.string(),
  vehiclePlate: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  requireGpsVerification: z.boolean().optional().default(false), // Valgfri GPS-verifisering
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userType !== "LEIETAKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = startBookingSchema.parse(body)

    // Hent parkeringsplass
    const parkingSpot = await prisma.parkingSpot.findUnique({
      where: { id: validatedData.parkingSpotId },
    })

    if (!parkingSpot) {
      return NextResponse.json(
        { error: "Parkeringsplass ikke funnet" },
        { status: 404 }
      )
    }

    if (!parkingSpot.supportsOnDemandBooking) {
      return NextResponse.json(
        { error: "Denne plassen støtter ikke start/stop parkering" },
        { status: 400 }
      )
    }

    // Verifiser GPS kun hvis kunden har aktivert det
    if (validatedData.requireGpsVerification) {
      if (parkingSpot.latitude && parkingSpot.longitude) {
        if (!isWithinTolerance(
          { latitude: validatedData.latitude, longitude: validatedData.longitude },
          { latitude: parkingSpot.latitude, longitude: parkingSpot.longitude },
          parkingSpot.gpsToleranceMeters || 50
        )) {
          return NextResponse.json(
            { error: "Du er ikke nær nok parkeringsplassen" },
            { status: 400 }
          )
        }
      } else {
        // Hvis parkeringsplassen ikke har GPS-koordinater, kan vi ikke verifisere
        return NextResponse.json(
          { error: "Parkeringsplassen har ikke GPS-koordinater for verifisering" },
          { status: 400 }
        )
      }
    }

    // Sjekk at plassen er tilgjengelig (leietakere kan ha flere aktive parkeringer)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        parkingSpotId: validatedData.parkingSpotId,
        status: "STARTED",
        bookingType: "ON_DEMAND",
      },
    })

    if (conflictingBooking) {
      return NextResponse.json(
        { error: "Parkeringsplassen er allerede i bruk" },
        { status: 400 }
      )
    }

    // Opprett booking
    const now = new Date()
    const booking = await prisma.booking.create({
      data: {
        parkingSpotId: validatedData.parkingSpotId,
        userId: session.user.id,
        bookingType: "ON_DEMAND",
        status: "STARTED",
        startTime: now,
        actualStartTime: now,
        vehiclePlate: validatedData.vehiclePlate,
        gpsStartLat: validatedData.latitude,
        gpsStartLng: validatedData.longitude,
        estimatedPrice: 0,
      },
      include: {
        parkingSpot: {
          select: {
            id: true,
            zoneNumber: true,
            zoneName: true,
            address: true,
            pricePerMinute: true,
            pricePerHour: true,
          },
        },
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error starting parking", error, { userId: session?.user?.id })
    return NextResponse.json(
      { error: "Kunne ikke starte parkering" },
      { status: 500 }
    )
  }
}

