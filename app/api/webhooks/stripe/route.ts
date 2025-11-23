import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = headers().get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set")
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const bookingId = paymentIntent.metadata?.bookingId

        if (!bookingId) {
          console.error("No bookingId in payment intent metadata")
          break
        }

        // Oppdater payment status
        await prisma.payment.update({
          where: { bookingId },
          data: {
            status: "COMPLETED",
            // paymentType er allerede satt ved opprettelse
          },
        })

        // Oppdater booking status til CONFIRMED
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
          },
        })

        // Payment succeeded - booking is now confirmed
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const bookingId = paymentIntent.metadata?.bookingId

        if (bookingId) {
          await prisma.payment.update({
            where: { bookingId },
            data: {
              status: "FAILED",
            },
          })
          console.error(`Payment failed for booking ${bookingId}`)
        }
        break
      }

      default:
        // Unhandled event type - log for debugging but don't fail
        if (process.env.NODE_ENV === "development") {
          console.info(`Unhandled Stripe event type: ${event.type}`)
        }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    )
  }
}

