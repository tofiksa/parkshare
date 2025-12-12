import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isWithinTolerance } from "@/lib/gps"
import { z } from "zod"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const prepareBookingSchema = z.object({
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
    const validatedData = prepareBookingSchema.parse(body)

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
    let gpsVerified = false
    if (validatedData.requireGpsVerification) {
      if (parkingSpot.latitude && parkingSpot.longitude) {
        gpsVerified = isWithinTolerance(
          { latitude: validatedData.latitude, longitude: validatedData.longitude },
          { latitude: parkingSpot.latitude, longitude: parkingSpot.longitude },
          parkingSpot.gpsToleranceMeters || 50
        )
      } else {
        // Hvis parkeringsplassen ikke har GPS-koordinater, kan vi ikke verifisere
        gpsVerified = false
      }
    } else {
      // Hvis GPS-verifisering ikke er aktivert, sett gpsVerified til true (ikke relevant)
      gpsVerified = true
    }

    // Sjekk at plassen er tilgjengelig
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        parkingSpotId: validatedData.parkingSpotId,
        status: "STARTED",
        bookingType: "ON_DEMAND",
      },
    })

    const isAvailable = !conflictingBooking

    // Beregn pricePerMinute hvis ikke satt
    const pricePerMinute = parkingSpot.pricePerMinute || 
      (parkingSpot.pricePerHour ? parkingSpot.pricePerHour / 60 : 0)

    // canStart er true hvis:
    // 1. Plassen er tilgjengelig, OG
    // 2. Hvis GPS-verifisering er aktivert, må GPS være verifisert
    const canStart = isAvailable && (!validatedData.requireGpsVerification || gpsVerified)

    return NextResponse.json({
      parkingSpot: {
        id: parkingSpot.id,
        zoneNumber: parkingSpot.zoneNumber,
        zoneName: parkingSpot.zoneName,
        address: parkingSpot.address,
        operator: parkingSpot.operator,
      },
      vehicle: {
        plateNumber: validatedData.vehiclePlate,
      },
      estimatedDuration: null, // For ON_DEMAND er dette null
      estimatedPrice: 0, // Starter på 0, beregnes etter stopp
      pricePerMinute,
      canStart,
      gpsVerified,
      isAvailable,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error preparing booking", error, { userId: session?.user?.id })
    return NextResponse.json(
      { error: "Kunne ikke forberede booking" },
      { status: 500 }
    )
  }
}

