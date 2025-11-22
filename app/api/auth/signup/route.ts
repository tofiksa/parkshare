import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const signupSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(8, "Passord må være minst 8 tegn"),
  phone: z.string().optional(),
  userType: z.enum(["UTLEIER", "LEIETAKER"]),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "En bruker med denne e-postadressen eksisterer allerede" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        phone: validatedData.phone,
        userType: validatedData.userType,
      },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
      },
    })

    // TODO: Send verification email
    // For now, we'll skip email verification in development

    return NextResponse.json(
      { message: "Bruker opprettet. Du kan nå logge inn.", user },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Signup error:", error)
    
    // I development, vis mer detaljer
    if (process.env.NODE_ENV === "development") {
      const errorMessage = error instanceof Error ? error.message : "Ukjent feil"
      return NextResponse.json(
        { 
          error: "Noe gikk galt ved opprettelse av konto",
          details: errorMessage,
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: "Noe gikk galt ved opprettelse av konto" },
      { status: 500 }
    )
  }
}

