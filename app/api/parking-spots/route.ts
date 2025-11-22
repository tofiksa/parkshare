import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { calculateSuggestedPrice } from "@/lib/pricing"
import { generateQRCode, generateQRCodeString } from "@/lib/qrcode"

const createParkingSpotSchema = z.object({
  type: z.enum(["UTENDORS", "INNENDORS"]),
  address: z.string().min(5, "Adresse må være minst 5 tegn"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
  pricePerHour: z.number().positive("Pris må være positiv"),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    // Hent alle parkeringsplasser for den innloggede brukeren
    const parkingSpots = await prisma.parkingSpot.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(parkingSpots)
  } catch (error) {
    console.error("Error fetching parking spots:", error)
    return NextResponse.json(
      { error: "Kunne ikke hente parkeringsplasser" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    // Sjekk at brukeren er utleier
    if (session.user.userType !== "UTLEIER") {
      return NextResponse.json(
        { error: "Kun utleiere kan opprette parkeringsplasser" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createParkingSpotSchema.parse(body)

    // For utendørs plasser, krever vi GPS-koordinater
    if (validatedData.type === "UTENDORS") {
      if (!validatedData.latitude || !validatedData.longitude) {
        return NextResponse.json(
          { error: "GPS-koordinater er påkrevd for utendørs plasser" },
          { status: 400 }
        )
      }
    }

    // Generer QR-kode for innendørs plasser
    let qrCode: string | null = null
    if (validatedData.type === "INNENDORS") {
      const qrCodeString = generateQRCodeString(session.user.id)
      qrCode = qrCodeString
    }

    // Opprett parkeringsplass
    const parkingSpot = await prisma.parkingSpot.create({
      data: {
        userId: session.user.id,
        type: validatedData.type,
        address: validatedData.address,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        imageUrl: validatedData.imageUrl,
        description: validatedData.description,
        pricePerHour: validatedData.pricePerHour,
        qrCode: qrCode,
      },
    })

    return NextResponse.json(parkingSpot, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating parking spot:", error)
    return NextResponse.json(
      { error: "Kunne ikke opprette parkeringsplass" },
      { status: 500 }
    )
  }
}

