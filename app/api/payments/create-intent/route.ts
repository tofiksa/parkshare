import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe, convertNokToOre } from "@/lib/stripe"
import { z } from "zod"
import { rateLimit, getClientIP } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const createIntentSchema = z.object({
  bookingId: z.string(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    // Rate limiting: 20 payment intents per 5 minutes per user
    const rateLimitResult = await rateLimit(`payment-intent:${session.user.id}`, 20, 300)
    
    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded for payment intent creation", { userId: session.user.id })
      return NextResponse.json(
        { error: "For mange betalingsforsøk. Prøv igjen senere." },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const validatedData = createIntentSchema.parse(body)

    // Hent booking
    const booking = await prisma.booking.findUnique({
      where: { id: validatedData.bookingId },
      include: {
        parkingSpot: {
          select: {
            address: true,
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

    // Sjekk at booking tilhører brukeren
    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne bookingen" },
        { status: 403 }
      )
    }

    // Sjekk at booking ikke allerede er betalt
    const existingPayment = await prisma.payment.findUnique({
      where: { bookingId: validatedData.bookingId },
    })

    if (existingPayment && existingPayment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Booking er allerede betalt" },
        { status: 400 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe er ikke konfigurert" },
        { status: 500 }
      )
    }

    // For ADVANCE bookinger skal totalPrice alltid være satt
    if (!booking.totalPrice) {
      return NextResponse.json(
        { error: "Booking mangler totalpris" },
        { status: 400 }
      )
    }

    // Opprett eller oppdater Payment Intent
    const amountInOre = convertNokToOre(booking.totalPrice)

    let paymentIntent
    if (existingPayment?.stripePaymentId) {
      // Oppdater eksisterende Payment Intent
      paymentIntent = await stripe.paymentIntents.update(existingPayment.stripePaymentId, {
        amount: amountInOre,
        currency: "nok",
      })
    } else {
      // Opprett ny Payment Intent
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInOre,
        currency: "nok",
        metadata: {
          bookingId: validatedData.bookingId,
          userId: session.user.id,
        },
        description: `Parkering: ${booking.parkingSpot.address}`,
      })

      // Opprett payment record i database
      await prisma.payment.upsert({
        where: { bookingId: validatedData.bookingId },
        create: {
          bookingId: validatedData.bookingId,
          amount: booking.totalPrice, // Allerede validert over
          currency: "NOK",
          stripePaymentId: paymentIntent.id,
          status: "PENDING",
          paymentType: booking.bookingType === "ON_DEMAND" ? "ON_DEMAND" : "ADVANCE",
        },
        update: {
          stripePaymentId: paymentIntent.id,
          status: "PENDING",
        },
      })
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error creating payment intent", error, { userId: session?.user?.id, bookingId: validatedData?.bookingId })
    return NextResponse.json(
      { error: "Kunne ikke opprette betaling" },
      { status: 500 }
    )
  }
}

