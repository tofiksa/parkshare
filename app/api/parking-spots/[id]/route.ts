import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logger } from "@/lib/logger"
import { sanitizeString } from "@/lib/sanitize"

const updateParkingSpotSchema = z.object({
  address: z.string().min(5).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
  pricePerHour: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  // Polygon-koordinater
  rectCorner1Lat: z.number().optional(),
  rectCorner1Lng: z.number().optional(),
  rectCorner2Lat: z.number().optional(),
  rectCorner2Lng: z.number().optional(),
  rectCorner3Lat: z.number().optional(),
  rectCorner3Lng: z.number().optional(),
  rectCorner4Lat: z.number().optional(),
  rectCorner4Lng: z.number().optional(),
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

    // Beregn pricePerMinute hvis ikke satt
    const pricePerMinute = parkingSpot.pricePerMinute || 
      (parkingSpot.pricePerHour ? parkingSpot.pricePerHour / 60 : null)

    // Returner parking spot med beregnet pricePerMinute
    return NextResponse.json({
      ...parkingSpot,
      pricePerMinute,
    })
  } catch (error) {
    logger.error("Error fetching parking spot", error, { parkingSpotId: params.id })
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

    // Beregn bounds fra polygon-koordinater hvis de er oppdatert
    let rectNorthLat: number | null = null
    let rectSouthLat: number | null = null
    let rectEastLng: number | null = null
    let rectWestLng: number | null = null

    if (
      validatedData.rectCorner1Lat !== undefined &&
      validatedData.rectCorner1Lng !== undefined &&
      validatedData.rectCorner2Lat !== undefined &&
      validatedData.rectCorner2Lng !== undefined &&
      validatedData.rectCorner3Lat !== undefined &&
      validatedData.rectCorner3Lng !== undefined &&
      validatedData.rectCorner4Lat !== undefined &&
      validatedData.rectCorner4Lng !== undefined
    ) {
      const lats = [
        validatedData.rectCorner1Lat,
        validatedData.rectCorner2Lat,
        validatedData.rectCorner3Lat,
        validatedData.rectCorner4Lat,
      ]
      const lngs = [
        validatedData.rectCorner1Lng,
        validatedData.rectCorner2Lng,
        validatedData.rectCorner3Lng,
        validatedData.rectCorner4Lng,
      ]

      rectNorthLat = Math.max(...lats)
      rectSouthLat = Math.min(...lats)
      rectEastLng = Math.max(...lngs)
      rectWestLng = Math.min(...lngs)
    }

    // Bygg oppdateringsdata
    const updateData: any = { ...validatedData }
    
    // Legg til bounds hvis polygon-koordinater er oppdatert
    if (rectNorthLat !== null) {
      updateData.rectNorthLat = rectNorthLat
      updateData.rectSouthLat = rectSouthLat
      updateData.rectEastLng = rectEastLng
      updateData.rectWestLng = rectWestLng
    }

    // Hvis imageUrl er fjernet eller mangler, og vi har koordinater, generer kartbilde
    if (!updateData.imageUrl && (updateData.latitude !== undefined || parkingSpot.latitude) && 
        (updateData.longitude !== undefined || parkingSpot.longitude)) {
      try {
        const latitude = updateData.latitude ?? parkingSpot.latitude
        const longitude = updateData.longitude ?? parkingSpot.longitude
        
        if (latitude && longitude) {
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
          const generateResponse = await fetch(`${baseUrl}/api/parking-spots/generate-map-image`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              parkingSpotId: params.id,
              latitude,
              longitude,
              rectCorner1Lat: updateData.rectCorner1Lat ?? parkingSpot.rectCorner1Lat,
              rectCorner1Lng: updateData.rectCorner1Lng ?? parkingSpot.rectCorner1Lng,
              rectCorner2Lat: updateData.rectCorner2Lat ?? parkingSpot.rectCorner2Lat,
              rectCorner2Lng: updateData.rectCorner2Lng ?? parkingSpot.rectCorner2Lng,
              rectCorner3Lat: updateData.rectCorner3Lat ?? parkingSpot.rectCorner3Lat,
              rectCorner3Lng: updateData.rectCorner3Lng ?? parkingSpot.rectCorner3Lng,
              rectCorner4Lat: updateData.rectCorner4Lat ?? parkingSpot.rectCorner4Lat,
              rectCorner4Lng: updateData.rectCorner4Lng ?? parkingSpot.rectCorner4Lng,
            }),
            })

            if (generateResponse.ok) {
              const imageData = await generateResponse.json()
              updateData.imageUrl = imageData.url
            }
          }
        } catch (error) {
          logger.error("Error generating map image", error, { parkingSpotId: params.id })
          // Fortsett uten bilde hvis generering feiler
        }
      }

    const updatedParkingSpot = await prisma.parkingSpot.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updatedParkingSpot)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error updating parking spot", error, { parkingSpotId: params.id, userId: session?.user?.id })
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
    logger.error("Error deleting parking spot", error, { parkingSpotId: params.id, userId: session?.user?.id })
    return NextResponse.json(
      { error: "Kunne ikke slette parkeringsplass" },
      { status: 500 }
    )
  }
}

