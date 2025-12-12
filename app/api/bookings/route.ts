import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimitResult = await rateLimit(`bookings-get:${session.user.id}`, 100, 60)
    
    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded for bookings GET", { userId: session.user.id })
      return NextResponse.json(
        { error: "For mange forespørsler. Prøv igjen senere." },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
          },
        }
      )
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
    logger.error("Error fetching bookings", error, { userId: session?.user?.id })
    return NextResponse.json(
      { error: "Kunne ikke hente bookinger" },
      { status: 500 }
    )
  }
}

