import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendEmail, getNewMessageEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { sanitizeMessageContent } from "@/lib/sanitize"

export const dynamic = "force-dynamic"

const createMessageSchema = z.object({
  content: z.string().min(1, "Melding kan ikke være tom").max(5000, "Melding kan ikke være lengre enn 5000 tegn"),
})

// GET - Hent alle meldinger for en booking
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    // Rate limiting: 60 requests per minute per user
    const rateLimitResult = await rateLimit(`messages-get:${session.user.id}`, 60, 60)
    
    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded for messages GET", { userId: session.user.id })
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

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true },
        },
        parkingSpot: {
          select: {
            userId: true,
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
    const isTenant = session.user.userType === "LEIETAKER" && booking.userId === session.user.id
    const isLandlord = session.user.userType === "UTLEIER" && booking.parkingSpot.userId === session.user.id

    if (!isTenant && !isLandlord) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne bookingen" },
        { status: 403 }
      )
    }

    // Hent alle meldinger for bookingen
    const messages = await prisma.message.findMany({
      where: {
        bookingId: params.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Marker mottatte meldinger som leste
    await prisma.message.updateMany({
      where: {
        bookingId: params.id,
        receiverId: session.user.id,
        read: false,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json(messages)
  } catch (error) {
    logger.error("Error fetching messages", error, { bookingId: params.id })
    return NextResponse.json(
      { error: "Kunne ikke hente meldinger" },
      { status: 500 }
    )
  }
}

// POST - Send ny melding
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    // Rate limiting: 20 messages per 5 minutes per user
    const rateLimitResult = await rateLimit(`messages-post:${session.user.id}`, 20, 300)
    
    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded for messages POST", { userId: session.user.id })
      return NextResponse.json(
        { error: "For mange meldinger. Prøv igjen senere." },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
          },
        }
      )
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true },
        },
        parkingSpot: {
          select: {
            userId: true,
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
    const isTenant = session.user.userType === "LEIETAKER" && booking.userId === session.user.id
    const isLandlord = session.user.userType === "UTLEIER" && booking.parkingSpot.userId === session.user.id

    if (!isTenant && !isLandlord) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne bookingen" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createMessageSchema.parse(body)

    // Sanitize message content
    const sanitizedContent = sanitizeMessageContent(validatedData.content)

    // Bestem mottaker (den andre parten i bookingen)
    const receiverId =
      session.user.userType === "LEIETAKER"
        ? booking.parkingSpot.userId
        : booking.userId

    // Hent booking info for e-post
    const bookingInfo = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        parkingSpot: {
          select: {
            address: true,
          },
        },
      },
    })

    // Opprett melding
    const message = await prisma.message.create({
      data: {
        bookingId: params.id,
        senderId: session.user.id,
        receiverId: receiverId,
        content: sanitizedContent,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Send e-postnotifikasjon til mottaker (async, ikke blokkerer respons)
    if (bookingInfo) {
      sendEmail({
        to: message.receiver.email,
        ...getNewMessageEmail(
          message.receiver.name,
          message.sender.name,
          {
            address: bookingInfo.parkingSpot.address,
            bookingId: params.id,
          },
          sanitizedContent.substring(0, 100) // Preview av første 100 tegn
        ),
      }).catch((error) => {
        logger.error("Error sending message notification email", error, { bookingId: params.id })
        // Ikke feil hvis e-post feiler - melding er fortsatt sendt
      })
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error creating message", error, { bookingId: params.id })
    return NextResponse.json(
      { error: "Kunne ikke sende melding" },
      { status: 500 }
    )
  }
}

