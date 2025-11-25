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

    // Hent alle aktive ON_DEMAND bookinger (leietakere kan ha flere aktive parkeringer)
    const bookings = await prisma.booking.findMany({
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
      orderBy: {
        actualStartTime: "desc", // Nyeste først
      },
    })

    if (bookings.length === 0) {
      return NextResponse.json([])
    }

    // Beregn varighet og estimert pris for hver booking
    const now = new Date()
    const bookingsWithDetails = bookings.map((booking) => {
      const startTime = booking.actualStartTime || booking.startTime
      const durationMs = now.getTime() - startTime.getTime()
      const durationMinutes = Math.ceil(durationMs / (1000 * 60))

      // Beregn pricePerMinute hvis ikke satt
      const pricePerMinute = booking.parkingSpot.pricePerMinute || 
        (booking.parkingSpot.pricePerHour / 60)

      const estimatedPrice = calculateEstimatedPrice(pricePerMinute, startTime)

      return {
        id: booking.id,
        status: booking.status,
        actualStartTime: booking.actualStartTime || booking.startTime,
        durationMinutes,
        remainingMinutes: null, // For ON_DEMAND er dette null (ingen maks)
        estimatedPrice,
        parkingSpot: booking.parkingSpot,
        vehiclePlate: booking.vehiclePlate,
      }
    })

    return NextResponse.json(bookingsWithDetails)
  } catch (error) {
    console.error("Error fetching active bookings:", error)
    return NextResponse.json(
      { error: "Kunne ikke hente aktive parkeringer" },
      { status: 500 }
    )
  }
}

