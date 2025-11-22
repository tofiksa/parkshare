import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import crypto from "crypto"
import { sendEmail } from "@/lib/email"

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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")
    const verificationTokenExpires = new Date()
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24) // 24 timer

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        phone: validatedData.phone,
        userType: validatedData.userType,
        verificationToken,
        verificationTokenExpires,
      },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
      },
    })

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken}`
    
    await sendEmail({
      to: validatedData.email,
      subject: "Verifiser din e-postadresse - Parkshare",
      html: `
        <h2>Velkommen til Parkshare!</h2>
        <p>Hei ${validatedData.name},</p>
        <p>Takk for at du registrerte deg på Parkshare. For å aktivere kontoen din, må du verifisere din e-postadresse.</p>
        <p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Verifiser e-postadresse
          </a>
        </p>
        <p>Eller kopier og lim inn denne lenken i nettleseren:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>Denne lenken er gyldig i 24 timer.</p>
        <p>Hvis du ikke opprettet denne kontoen, kan du ignorere denne e-posten.</p>
        <p>Med vennlig hilsen,<br>Parkshare-teamet</p>
      `,
      text: `
Velkommen til Parkshare!

Hei ${validatedData.name},

Takk for at du registrerte deg på Parkshare. For å aktivere kontoen din, må du verifisere din e-postadresse.

Klikk på denne lenken for å verifisere:
${verificationUrl}

Denne lenken er gyldig i 24 timer.

Hvis du ikke opprettet denne kontoen, kan du ignorere denne e-posten.

Med vennlig hilsen,
Parkshare-teamet
      `.trim(),
    })

    return NextResponse.json(
      { 
        message: "Bruker opprettet. Sjekk din e-post for å verifisere kontoen din.", 
        user,
        requiresVerification: true,
      },
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

