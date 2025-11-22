import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Nåværende passord er påkrevd"),
  newPassword: z.string().min(8, "Nytt passord må være minst 8 tegn"),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
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

    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: "Kunne ikke endre passord" },
      { status: 500 }
    )
  }
}

