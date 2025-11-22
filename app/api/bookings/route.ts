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

    const { searchParams } = new URL(request.url)
    const userType = searchParams.get("userType") // "UTLEIER" eller "LEIETAKER"

    let bookings

    if (userType === "UTLEIER") {
      // Hent bookinger for alle parkeringsplasser som tilhører utleieren
      bookings = await prisma.booking.findMany({
        where: {
          parkingSpot: {
            userId: session.user.id,
          },
        },
        include: {
          parkingSpot: {
            select: {
              id: true,
              address: true,
              type: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
      })
    } else {
      // Hent bookinger for leietakeren
      bookings = await prisma.booking.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          parkingSpot: {
            select: {
              id: true,
              address: true,
              type: true,
              latitude: true,
              longitude: true,
              imageUrl: true,
              qrCode: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
      })
    }

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json(
      { error: "Kunne ikke hente bookinger" },
      { status: 500 }
    )
  }
}

