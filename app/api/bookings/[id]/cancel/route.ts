import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, getCancellationEmail } from "@/lib/email"
import { stripe, convertNokToOre } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        parkingSpot: {
          include: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })

    // Hent payment info for refundering
    const payment = await prisma.payment.findUnique({
      where: { bookingId: params.id },
    })

    if (!booking) {
      return NextResponse.json(
        { error: "Booking ikke funnet" },
        { status: 404 }
      )
    }

    // Sjekk at brukeren har tilgang
    if (
      session.user.userType === "LEIETAKER" &&
      booking.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne bookingen" },
        { status: 403 }
      )
    }

    // Sjekk at booking kan avbestilles
    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Booking er allerede avbestilt" },
        { status: 400 }
      )
    }

    if (booking.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Kan ikke avbestille fullført booking" },
        { status: 400 }
      )
    }

    // Sjekk 30-minutters regel for leietakere
    if (session.user.userType === "LEIETAKER") {
      const startTime = new Date(booking.startTime)
      const now = new Date()
      const minutesUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60)

      if (minutesUntilStart <= 30) {
        return NextResponse.json(
          { error: "Kan kun avbestille mer enn 30 minutter før oppstart" },
          { status: 400 }
        )
      }
    }

    // Refunder betaling hvis booking er betalt
    if (payment && payment.status === "COMPLETED" && payment.stripePaymentId && stripe) {
      try {
        // Opprett refund i Stripe
        await stripe.refunds.create({
          payment_intent: payment.stripePaymentId,
          amount: convertNokToOre(booking.totalPrice),
        })

        // Oppdater payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "REFUNDED",
            refundedAt: new Date(),
          },
        })
      } catch (error) {
        console.error("Error processing refund:", error)
        // Fortsett med avbestilling selv om refundering feiler
      }
    }

    // Oppdater booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    })

    // Send e-postnotifikasjoner (async, ikke blokkerer respons)
    Promise.all([
      // E-post til leietaker
      sendEmail({
        to: booking.user.email,
        ...getCancellationEmail(booking.user.name, {
          address: booking.parkingSpot.address,
          startTime: booking.startTime.toISOString(),
          totalPrice: booking.totalPrice,
        }),
      }),
      // E-post til utleier
      sendEmail({
        to: booking.parkingSpot.user.email,
        subject: `Booking avbestilt - ${booking.parkingSpot.address}`,
        html: `
          <h2>Booking avbestilt</h2>
          <p>Hei ${booking.parkingSpot.user.name},</p>
          <p>En booking på din parkeringsplass har blitt avbestilt:</p>
          <ul>
            <li><strong>Adresse:</strong> ${booking.parkingSpot.address}</li>
            <li><strong>Leietaker:</strong> ${booking.user.name}</li>
            <li><strong>Planlagt starttid:</strong> ${new Date(booking.startTime).toLocaleString("no-NO")}</li>
            <li><strong>Refundert beløp:</strong> ${booking.totalPrice.toFixed(2)} NOK</li>
          </ul>
          <p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/bookings">Se bookinger i dashboard</a></p>
        `,
      }),
    ]).catch((error) => {
      console.error("Error sending cancellation emails:", error)
      // Ikke feil hvis e-post feiler - booking er fortsatt avbestilt
    })

    return NextResponse.json({
      message: "Booking avbestilt",
      booking: updatedBooking,
      refunded: payment?.status === "COMPLETED",
    })
  } catch (error) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json(
      { error: "Kunne ikke avbestille booking" },
      { status: 500 }
    )
  }
}

