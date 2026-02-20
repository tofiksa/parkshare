import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        parkingSpot: {
          select: {
            zoneNumber: true,
            zoneName: true,
            operator: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: "Booking ikke funnet" },
        { status: 404 }
      )
    }

    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne bookingen" },
        { status: 403 }
      )
    }

    if (booking.bookingType !== "ON_DEMAND") {
      return NextResponse.json(
        { error: "Denne endepunktet er kun for ON_DEMAND bookinger" },
        { status: 400 }
      )
    }

    // Hent payment info
    const payment = await prisma.payment.findUnique({
      where: { bookingId: params.id },
    })

    const startTime = booking.actualStartTime || booking.startTime
    const endTime = booking.actualEndTime || booking.endTime
    const durationMs = endTime && startTime 
      ? endTime.getTime() - startTime.getTime()
      : 0
    const durationMinutes = Math.floor(durationMs / (1000 * 60))
    const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000)

    return NextResponse.json({
      id: booking.id,
      parkingSpot: {
        zoneNumber: booking.parkingSpot.zoneNumber,
        zoneName: booking.parkingSpot.zoneName,
        operator: booking.parkingSpot.operator,
      },
      vehicle: {
        plateNumber: booking.vehiclePlate,
      },
      startTime: startTime.toISOString(),
      endTime: endTime?.toISOString() || null,
      durationMinutes,
      durationSeconds,
      pricing: {
        parkingPrice: booking.totalPrice || 0,
        serviceFee: 0, // Kan utvides senere
        total: booking.totalPrice || 0,
        vatIncluded: true,
      },
      payment: payment ? {
        status: payment.status,
        method: "Stripe", // Kan utvides senere
      } : null,
    })
  } catch (error) {
    logger.error("Error fetching booking summary", error, { bookingId: params.id })
    return NextResponse.json(
      { error: "Kunne ikke hente sammendrag" },
      { status: 500 }
    )
  }
}

