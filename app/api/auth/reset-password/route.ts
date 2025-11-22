import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token er påkrevd"),
  password: z.string().min(8, "Passord må være minst 8 tegn"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)

    // Finn bruker med gyldig token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: validatedData.token,
        resetTokenExpires: {
          gt: new Date(), // Token må ikke være utløpt
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Ugyldig eller utløpt reset token. Vennligst be om en ny reset-link." },
        { status: 400 }
      )
    }

    // Hash nytt passord
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Oppdater passord og fjern reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    })

    return NextResponse.json({
      message: "Passordet ditt har blitt nullstilt. Du kan nå logge inn med ditt nye passord.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error resetting password:", error)
    return NextResponse.json(
      { error: "Noe gikk galt. Prøv igjen senere." },
      { status: 500 }
    )
  }
}

