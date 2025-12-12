import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePriceByMinutes } from "@/lib/pricing"
import { stripe, convertNokToOre } from "@/lib/stripe"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(
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
            id: true,
            pricePerMinute: true,
            pricePerHour: true,
            zoneNumber: true,
            zoneName: true,
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

    if (booking.status !== "STARTED" || booking.bookingType !== "ON_DEMAND") {
      return NextResponse.json(
        { error: "Kan kun stoppe pågående ON_DEMAND parkering" },
        { status: 400 }
      )
    }

    // Beregn varighet og pris
    const now = new Date()
    const startTime = booking.actualStartTime || booking.startTime
    
    // Beregn pricePerMinute hvis ikke satt
    const pricePerMinute = booking.parkingSpot.pricePerMinute || 
      (booking.parkingSpot.pricePerHour ? booking.parkingSpot.pricePerHour / 60 : 0)
    
    const totalPrice = calculatePriceByMinutes(pricePerMinute, startTime, now)

    // Oppdater booking
    const durationMs = now.getTime() - startTime.getTime()
    const durationMinutes = Math.ceil(durationMs / (1000 * 60))

    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        endTime: now,
        actualEndTime: now,
        durationMinutes,
        totalPrice,
      },
    })

    // Opprett Payment Intent
    let paymentIntent = null
    if (stripe && totalPrice > 0) {
      const amountInOre = convertNokToOre(totalPrice)
      
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInOre,
        currency: "nok",
        metadata: {
          bookingId: params.id,
          userId: session.user.id,
          bookingType: "ON_DEMAND",
        },
        description: `Parkering: ${booking.parkingSpot.zoneName || booking.parkingSpot.zoneNumber}`,
      })

      await prisma.payment.create({
        data: {
          bookingId: params.id,
          amount: totalPrice,
          currency: "NOK",
          stripePaymentId: paymentIntent.id,
          status: "PENDING",
          paymentType: "ON_DEMAND",
        },
      })
    }

    return NextResponse.json({
      ...updatedBooking,
      paymentIntent: paymentIntent ? {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      } : null,
    })
  } catch (error) {
    logger.error("Error stopping parking", error, { bookingId: params.id })
    return NextResponse.json(
      { error: "Kunne ikke stoppe parkering" },
      { status: 500 }
    )
  }
}

