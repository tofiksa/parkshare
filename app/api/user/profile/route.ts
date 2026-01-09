import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const updateProfileSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn").optional(),
  phone: z.string().optional().nullable(),
})

// GET - Hent brukerprofil
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        userType: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Bruker ikke funnet" },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    logger.error("Error fetching user profile", error)
    return NextResponse.json(
      { error: "Kunne ikke hente brukerprofil" },
      { status: 500 }
    )
  }
}

// PATCH - Oppdater brukerprofil
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        userType: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error updating user profile", error)
    return NextResponse.json(
      { error: "Kunne ikke oppdatere brukerprofil" },
      { status: 500 }
    )
  }
}

