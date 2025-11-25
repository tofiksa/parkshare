import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, getBookingReminderEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

// Denne route kan kalles av en cron job (f.eks. Vercel Cron eller ekstern cron service)
// for å sende påminnelser 1 time før booking starter
export async function GET(request: Request) {
  try {
    // Sjekk autorisering (kan bruke API key eller secret header)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000) // 1 time fra nå
    const oneHourTenMinutesFromNow = new Date(now.getTime() + 70 * 60 * 1000) // 1 time 10 min fra nå

    // Finn bookinger som starter om ca. 1 time (innenfor 10 minutters vindu)
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        startTime: {
          gte: oneHourFromNow,
          lte: oneHourTenMinutesFromNow,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        parkingSpot: {
          select: {
            address: true,
            type: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    })

    const results = await Promise.allSettled(
      upcomingBookings.map(async (booking) => {
        try {
          // For ADVANCE bookinger skal endTime alltid være satt
          if (booking.endTime) {
          await sendEmail({
            to: booking.user.email,
            ...getBookingReminderEmail(booking.user.name, {
              address: booking.parkingSpot.address,
              startTime: booking.startTime.toISOString(),
              endTime: booking.endTime.toISOString(),
              type: booking.parkingSpot.type,
              qrCode: booking.qrCode,
              latitude: booking.parkingSpot.latitude,
              longitude: booking.parkingSpot.longitude,
            }),
          })
          }
          return { bookingId: booking.id, success: true }
        } catch (error) {
          console.error(`Error sending reminder for booking ${booking.id}:`, error)
          return { bookingId: booking.id, success: false, error: error instanceof Error ? error.message : "Ukjent feil" }
        }
      })
    )

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length
    const failed = results.length - successful

    return NextResponse.json({
      message: `Sendt ${successful} påminnelser, ${failed} feilet`,
      total: upcomingBookings.length,
      successful,
      failed,
    })
  } catch (error) {
    console.error("Error processing booking reminders:", error)
    return NextResponse.json(
      { error: "Kunne ikke behandle påminnelser" },
      { status: 500 }
    )
  }
}

