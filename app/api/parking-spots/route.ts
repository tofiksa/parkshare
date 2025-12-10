import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { calculateSuggestedPrice } from "@/lib/pricing"
import { generateQRCode, generateQRCodeString } from "@/lib/qrcode"
import { logger } from "@/lib/logger"

const createParkingSpotSchema = z.object({
  type: z.enum(["UTENDORS", "INNENDORS"]),
  address: z.string().min(5, "Adresse må være minst 5 tegn"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
  pricePerHour: z.number().positive("Pris må være positiv"),
  // Polygon-koordinater (valgfritt, men påkrevd for UTENDORS)
  rectCorner1Lat: z.number().optional(),
  rectCorner1Lng: z.number().optional(),
  rectCorner2Lat: z.number().optional(),
  rectCorner2Lng: z.number().optional(),
  rectCorner3Lat: z.number().optional(),
  rectCorner3Lng: z.number().optional(),
  rectCorner4Lat: z.number().optional(),
  rectCorner4Lng: z.number().optional(),
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
    logger.error("Error fetching parking spots", error)
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

    // Valider at alle polygon-koordinater er satt for alle typer
    if (
      !validatedData.rectCorner1Lat ||
      !validatedData.rectCorner1Lng ||
      !validatedData.rectCorner2Lat ||
      !validatedData.rectCorner2Lng ||
      !validatedData.rectCorner3Lat ||
      !validatedData.rectCorner3Lng ||
      !validatedData.rectCorner4Lat ||
      !validatedData.rectCorner4Lng
    ) {
      return NextResponse.json(
        { error: "Polygon-koordinater er påkrevd. Vennligst tegn parkeringsplassen på kartet." },
        { status: 400 }
      )
    }

    // For utendørs plasser, krever vi også GPS-koordinater
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

    // Beregn bounds fra polygon-koordinater hvis de er satt
    let rectNorthLat: number | null = null
    let rectSouthLat: number | null = null
    let rectEastLng: number | null = null
    let rectWestLng: number | null = null

    if (
      validatedData.rectCorner1Lat &&
      validatedData.rectCorner1Lng &&
      validatedData.rectCorner2Lat &&
      validatedData.rectCorner2Lng &&
      validatedData.rectCorner3Lat &&
      validatedData.rectCorner3Lng &&
      validatedData.rectCorner4Lat &&
      validatedData.rectCorner4Lng
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

    // Generer unikt zoneNumber basert på timestamp og random tall
    // Format: YYYYMMDDHHMMSS + 3 random siffer (f.eks. "20241122143052123")
    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14) // YYYYMMDDHHMMSS
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const zoneNumber = `${timestamp}${random}`

    // Generer zoneName basert på adresse (første del av adressen)
    const zoneName = validatedData.address.split(',')[0].trim()

    // Sett operator til standard verdi
    const operator = "Parkshare"

    // Opprett parkeringsplass først (vi trenger ID for å generere bilde)
    const parkingSpot = await prisma.parkingSpot.create({
      data: {
        userId: session.user.id,
        type: validatedData.type,
        address: validatedData.address,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        imageUrl: validatedData.imageUrl || null,
        description: validatedData.description,
        pricePerHour: validatedData.pricePerHour,
        qrCode: qrCode,
        // Polygon-koordinater
        rectCorner1Lat: validatedData.rectCorner1Lat,
        rectCorner1Lng: validatedData.rectCorner1Lng,
        rectCorner2Lat: validatedData.rectCorner2Lat,
        rectCorner2Lng: validatedData.rectCorner2Lng,
        rectCorner3Lat: validatedData.rectCorner3Lat,
        rectCorner3Lng: validatedData.rectCorner3Lng,
        rectCorner4Lat: validatedData.rectCorner4Lat,
        rectCorner4Lng: validatedData.rectCorner4Lng,
        // Bounds (beregnet fra polygon)
        rectNorthLat,
        rectSouthLat,
        rectEastLng,
        rectWestLng,
        // Sikre at parkeringsplassen er aktiv og støtter begge booking-typer
        isActive: true,
        supportsAdvanceBooking: true,
        supportsOnDemandBooking: true, // Støtt også ON_DEMAND booking
        // Zone-informasjon
        zoneNumber,
        zoneName,
        operator,
      },
    })

    // Hvis ingen bilde er oppgitt, generer kartbilde etter opprettelse
    let finalParkingSpot = parkingSpot
    if (!parkingSpot.imageUrl && parkingSpot.latitude && parkingSpot.longitude) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const generateResponse = await fetch(`${baseUrl}/api/parking-spots/generate-map-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            parkingSpotId: parkingSpot.id,
            latitude: parkingSpot.latitude,
            longitude: parkingSpot.longitude,
            rectCorner1Lat: parkingSpot.rectCorner1Lat,
            rectCorner1Lng: parkingSpot.rectCorner1Lng,
            rectCorner2Lat: parkingSpot.rectCorner2Lat,
            rectCorner2Lng: parkingSpot.rectCorner2Lng,
            rectCorner3Lat: parkingSpot.rectCorner3Lat,
            rectCorner3Lng: parkingSpot.rectCorner3Lng,
            rectCorner4Lat: parkingSpot.rectCorner4Lat,
            rectCorner4Lng: parkingSpot.rectCorner4Lng,
          }),
        })

        if (generateResponse.ok) {
          const imageData = await generateResponse.json()
          // Oppdater parkeringsplassen med generert bilde
          finalParkingSpot = await prisma.parkingSpot.update({
            where: { id: parkingSpot.id },
            data: { imageUrl: imageData.url },
          })
        }
      } catch (error) {
        logger.error("Error generating map image", error, { parkingSpotId: parkingSpot.id })
        // Fortsett uten bilde hvis generering feiler
      }
    }

    return NextResponse.json(finalParkingSpot, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error creating parking spot", error, { userId: session?.user?.id })
    return NextResponse.json(
      { error: "Kunne ikke opprette parkeringsplass" },
      { status: 500 }
    )
  }
}

