import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    if (session.user.userType !== "UTLEIER") {
      return NextResponse.json(
        { error: "Kun utleiere kan se inntekter" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "all" // "all", "month", "year"

    const now = new Date()
    let startDate: Date | undefined

    switch (period) {
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = undefined
    }

    // Hent alle bookinger for utleierens parkeringsplasser
    const bookings = await prisma.booking.findMany({
      where: {
        parkingSpot: {
          userId: session.user.id,
        },
        status: {
          in: ["CONFIRMED", "ACTIVE", "COMPLETED"],
        },
        ...(startDate && {
          createdAt: {
            gte: startDate,
          },
        }),
      },
      include: {
        parkingSpot: {
          select: {
            id: true,
            address: true,
          },
        },
      },
    })

    // Beregn total inntekt (kun bookinger med totalPrice)
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0)

    // Beregn inntekt per parkeringsplass
    const revenueBySpot = bookings.reduce((acc, booking) => {
      const spotId = booking.parkingSpotId
      if (!acc[spotId]) {
        acc[spotId] = {
          spotId,
          address: booking.parkingSpot.address,
          revenue: 0,
          bookings: 0,
        }
      }
      acc[spotId].revenue += booking.totalPrice || 0
      acc[spotId].bookings += 1
      return acc
    }, {} as Record<string, { spotId: string; address: string; revenue: number; bookings: number }>)

    return NextResponse.json({
      totalRevenue,
      totalBookings: bookings.length,
      revenueBySpot: Object.values(revenueBySpot),
      period,
    })
  } catch (error) {
    console.error("Error fetching revenue:", error)
    return NextResponse.json(
      { error: "Kunne ikke hente inntekter" },
      { status: 500 }
    )
  }
}

