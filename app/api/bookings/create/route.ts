import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { calculateTotalPrice } from "@/lib/pricing"
import { generateQRCodeString } from "@/lib/qrcode"
import { sendEmail, getBookingConfirmationEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

const createBookingSchema = z.object({
  parkingSpotId: z.string(),
  startTime: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, {
    message: "Ugyldig starttid format",
  }),
  endTime: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, {
    message: "Ugyldig sluttid format",
  }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Du må godkjenne avtalevilkårene",
  }),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    if (session.user.userType !== "LEIETAKER") {
      return NextResponse.json(
        { error: "Kun leietakere kan opprette bookinger" },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Debug logging
    console.log("Booking create request body:", JSON.stringify(body, null, 2))
    
    const validatedData = createBookingSchema.parse(body)

    const startTime = new Date(validatedData.startTime)
    const endTime = new Date(validatedData.endTime)

    // Validering
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "Sluttid må være etter starttid" },
        { status: 400 }
      )
    }

    if (startTime < new Date()) {
      return NextResponse.json(
        { error: "Starttid kan ikke være i fortiden" },
        { status: 400 }
      )
    }

    // Sjekk at parkeringsplassen eksisterer og er aktiv
    const parkingSpot = await prisma.parkingSpot.findUnique({
      where: { id: validatedData.parkingSpotId },
    })

    if (!parkingSpot) {
      return NextResponse.json(
        { error: "Parkeringsplass ikke funnet" },
        { status: 404 }
      )
    }

    if (!parkingSpot.isActive) {
      return NextResponse.json(
        { error: "Parkeringsplassen er ikke tilgjengelig" },
        { status: 400 }
      )
    }

    // Sjekk tilgjengelighet (kun for ADVANCE bookinger)
    // Ekskluder STARTED status og kun sjekk ADVANCE bookinger
    const conflictingBookings = await prisma.booking.findFirst({
      where: {
        parkingSpotId: validatedData.parkingSpotId,
        bookingType: "ADVANCE", // KUN sjekk ADVANCE bookinger
        status: {
          in: ["PENDING", "CONFIRMED", "ACTIVE"], // Ikke STARTED
        },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gte: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lte: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    })

    if (conflictingBookings) {
      return NextResponse.json(
        { error: "Parkeringsplassen er ikke tilgjengelig i denne perioden" },
        { status: 400 }
      )
    }

    // Beregn totalpris
    const totalPrice = calculateTotalPrice(parkingSpot.pricePerHour, startTime, endTime)

    // Generer QR-kode for innendørs plasser
    let qrCode: string | null = null
    if (parkingSpot.type === "INNENDORS") {
      qrCode = generateQRCodeString(validatedData.parkingSpotId)
    }

    // Opprett booking med terms acceptance
    // termsAccepted er allerede validert av Zod schema
    // Valider at endTime og totalPrice er satt for ADVANCE
    if (!endTime || !totalPrice) {
      return NextResponse.json(
        { error: "ADVANCE booking må ha endTime og totalPrice" },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.create({
      data: {
        parkingSpotId: validatedData.parkingSpotId,
        userId: session.user.id,
        bookingType: "ADVANCE", // Eksplisitt sett bookingType
        startTime,
        endTime, // Required for ADVANCE
        totalPrice, // Required for ADVANCE
        status: "PENDING",
        qrCode,
        termsAcceptance: {
          create: {
            userId: session.user.id,
            accepted: true,
            acceptedAt: new Date(),
          },
        },
      },
      include: {
        parkingSpot: {
          include: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        termsAcceptance: true,
      },
    })

    // Send e-postnotifikasjoner (async, ikke blokkerer respons)
    // For ADVANCE bookinger er endTime og totalPrice alltid satt
    if (booking.endTime && booking.totalPrice) {
      Promise.all([
        // E-post til leietaker
        sendEmail({
          to: booking.user.email,
          ...getBookingConfirmationEmail(booking.user.name, {
            address: booking.parkingSpot.address,
            startTime: new Date(booking.startTime).toISOString(),
            endTime: new Date(booking.endTime).toISOString(),
            totalPrice: booking.totalPrice,
            type: booking.parkingSpot.type,
            qrCode: booking.qrCode,
          }),
        }),
        // E-post til utleier
        sendEmail({
          to: booking.parkingSpot.user.email,
          subject: `Ny booking på ${booking.parkingSpot.address}`,
          html: `
            <h2>Ny booking mottatt</h2>
            <p>Hei ${booking.parkingSpot.user.name},</p>
            <p>Du har mottatt en ny booking på din parkeringsplass:</p>
            <ul>
              <li><strong>Adresse:</strong> ${booking.parkingSpot.address}</li>
              <li><strong>Leietaker:</strong> ${booking.user.name}</li>
              <li><strong>Starttid:</strong> ${new Date(booking.startTime).toLocaleString("no-NO")}</li>
              <li><strong>Sluttid:</strong> ${new Date(booking.endTime).toLocaleString("no-NO")}</li>
              <li><strong>Totalpris:</strong> ${booking.totalPrice.toFixed(2)} NOK</li>
            </ul>
            <p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/bookings">Se booking i dashboard</a></p>
          `,
        }),
      ]).catch((error) => {
        console.error("Error sending booking confirmation emails:", error)
        // Ikke feil hvis e-post feiler - booking er fortsatt opprettet
      })
    }

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating booking:", error)
    return NextResponse.json(
      { error: "Kunne ikke opprette booking" },
      { status: 500 }
    )
  }
}

