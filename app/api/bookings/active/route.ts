import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateEstimatedPrice } from "@/lib/pricing"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Hent aktiv ON_DEMAND booking
    const booking = await prisma.booking.findFirst({
      where: {
        userId: session.user.id,
        status: "STARTED",
        bookingType: "ON_DEMAND",
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

    if (!booking) {
      return NextResponse.json(null)
    }

    // Beregn varighet og estimert pris
    const startTime = booking.actualStartTime || booking.startTime
    const now = new Date()
    const durationMs = now.getTime() - startTime.getTime()
    const durationMinutes = Math.ceil(durationMs / (1000 * 60))

    // Beregn pricePerMinute hvis ikke satt
    const pricePerMinute = booking.parkingSpot.pricePerMinute || 
      (booking.parkingSpot.pricePerHour / 60)

    const estimatedPrice = calculateEstimatedPrice(pricePerMinute, startTime)

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      actualStartTime: booking.actualStartTime || booking.startTime,
      durationMinutes,
      remainingMinutes: null, // For ON_DEMAND er dette null (ingen maks)
      estimatedPrice,
      parkingSpot: booking.parkingSpot,
      vehiclePlate: booking.vehiclePlate,
    })
  } catch (error) {
    console.error("Error fetching active booking:", error)
    return NextResponse.json(
      { error: "Kunne ikke hente aktiv parkering" },
      { status: 500 }
    )
  }
}

