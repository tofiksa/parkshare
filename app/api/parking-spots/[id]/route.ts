import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateParkingSpotSchema = z.object({
  address: z.string().min(5).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
  pricePerHour: z.number().positive().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    const parkingSpot = await prisma.parkingSpot.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!parkingSpot) {
      return NextResponse.json(
        { error: "Parkeringsplass ikke funnet" },
        { status: 404 }
      )
    }

    return NextResponse.json(parkingSpot)
  } catch (error) {
    console.error("Error fetching parking spot:", error)
    return NextResponse.json(
      { error: "Kunne ikke hente parkeringsplass" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    // Sjekk at parkeringsplassen tilhører brukeren
    const parkingSpot = await prisma.parkingSpot.findUnique({
      where: { id: params.id },
    })

    if (!parkingSpot) {
      return NextResponse.json(
        { error: "Parkeringsplass ikke funnet" },
        { status: 404 }
      )
    }

    if (parkingSpot.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne parkeringsplassen" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateParkingSpotSchema.parse(body)

    const updatedParkingSpot = await prisma.parkingSpot.update({
      where: { id: params.id },
      data: validatedData,
    })

    return NextResponse.json(updatedParkingSpot)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating parking spot:", error)
    return NextResponse.json(
      { error: "Kunne ikke oppdatere parkeringsplass" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    // Sjekk at parkeringsplassen tilhører brukeren
    const parkingSpot = await prisma.parkingSpot.findUnique({
      where: { id: params.id },
    })

    if (!parkingSpot) {
      return NextResponse.json(
        { error: "Parkeringsplass ikke funnet" },
        { status: 404 }
      )
    }

    if (parkingSpot.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne parkeringsplassen" },
        { status: 403 }
      )
    }

    // Sjekk om det er aktive bookinger
    const activeBookings = await prisma.booking.findFirst({
      where: {
        parkingSpotId: params.id,
        status: {
          in: ["PENDING", "CONFIRMED", "ACTIVE"],
        },
      },
    })

    if (activeBookings) {
      return NextResponse.json(
        { error: "Kan ikke slette parkeringsplass med aktive bookinger" },
        { status: 400 }
      )
    }

    await prisma.parkingSpot.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Parkeringsplass slettet" })
  } catch (error) {
    console.error("Error deleting parking spot:", error)
    return NextResponse.json(
      { error: "Kunne ikke slette parkeringsplass" },
      { status: 500 }
    )
  }
}

