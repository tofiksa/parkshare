import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Nåværende passord er påkrevd"),
  newPassword: z.string()
    .min(8, "Nytt passord må være minst 8 tegn")
    .regex(/[A-Z]/, "Passord må inneholde minst én stor bokstav")
    .regex(/[a-z]/, "Passord må inneholde minst én liten bokstav")
    .regex(/[0-9]/, "Passord må inneholde minst ett tall")
    .regex(/[^A-Za-z0-9]/, "Passord må inneholde minst ett spesialtegn"),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    // Rate limiting: 5 password changes per 15 minutes per user
    const rateLimitResult = await rateLimit(`change-password:${session.user.id}`, 5, 900)
    
    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded for password change", { userId: session.user.id })
      return NextResponse.json(
        { error: "For mange passordendringsforsøk. Prøv igjen senere." },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const validatedData = changePasswordSchema.parse(body)

    // Hent bruker med passord
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Bruker ikke funnet" },
        { status: 404 }
      )
    }

    // Verifiser nåværende passord
    const isPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      user.password
    )

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Nåværende passord er feil" },
        { status: 400 }
      )
    }

    // Hash nytt passord
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10)

    // Oppdater passord
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      message: "Passordet ditt har blitt endret.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error changing password", error, { userId: session?.user?.id })
    return NextResponse.json(
      { error: "Kunne ikke endre passord" },
      { status: 500 }
    )
  }
}

