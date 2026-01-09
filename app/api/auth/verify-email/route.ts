import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logger } from "@/lib/logger"

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token er påkrevd"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = verifyEmailSchema.parse(body)

    // Find user with this verification token
    const user = await prisma.user.findUnique({
      where: { verificationToken: validatedData.token },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Ugyldig eller utløpt verifiseringstoken" },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
      return NextResponse.json(
        { error: "Verifiseringstokenet har utløpt. Be om en ny verifiseringslink." },
        { status: 400 }
      )
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: "E-postadressen er allerede verifisert" },
        { status: 200 }
      )
    }

    // Update user to mark email as verified and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpires: null,
      },
    })

    return NextResponse.json(
      { message: "E-postadresse verifisert" },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error verifying email", error)
    return NextResponse.json(
      { error: "Kunne ikke verifisere e-postadresse" },
      { status: 500 }
    )
  }
}

