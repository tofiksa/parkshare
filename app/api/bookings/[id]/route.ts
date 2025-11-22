import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
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
          select: {
            id: true,
            userId: true,
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
    })

    if (!booking) {
      return NextResponse.json(
        { error: "Booking ikke funnet" },
        { status: 404 }
      )
    }

    // Sjekk at brukeren har tilgang til bookingen
    if (
      session.user.userType === "LEIETAKER" &&
      booking.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne bookingen" },
        { status: 403 }
      )
    }

    if (
      session.user.userType === "UTLEIER" &&
      booking.parkingSpot.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne bookingen" },
        { status: 403 }
      )
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Error fetching booking:", error)
    return NextResponse.json(
      { error: "Kunne ikke hente booking" },
      { status: 500 }
    )
  }
}

