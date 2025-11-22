import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"

export const dynamic = "force-dynamic"

const forgotPasswordSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = forgotPasswordSchema.parse(body)

    // Finn bruker
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    // Alltid returner success (for sikkerhet - ikke avslør om bruker eksisterer)
    if (!user) {
      return NextResponse.json({
        message: "Hvis denne e-postadressen eksisterer, vil du motta en e-post med instruksjoner for å nullstille passordet.",
      })
    }

    // Generer reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpires = new Date()
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1) // Token utløper om 1 time

    // Lagre token i database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires,
      },
    })

    // Send e-post med reset link
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`

    await sendEmail({
      to: user.email,
      subject: "Nullstill passord - Parkshare",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
              .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Nullstill passord</h1>
              </div>
              <div class="content">
                <p>Hei ${user.name},</p>
                <p>Du har bedt om å nullstille passordet ditt. Klikk på knappen under for å velge et nytt passord:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Nullstill passord</a>
                </div>

                <p>Eller kopier og lim inn denne lenken i nettleseren:</p>
                <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>

                <div class="warning">
                  <p><strong>⚠️ Viktig:</strong></p>
                  <ul>
                    <li>Denne lenken er gyldig i 1 time</li>
                    <li>Hvis du ikke ba om å nullstille passordet, kan du ignorere denne e-posten</li>
                    <li>Passordet ditt vil ikke endres før du klikker på lenken og velger et nytt passord</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>Parkshare - Din parkeringsløsning</p>
                <p>Denne e-posten ble sendt automatisk. Vennligst ikke svar på denne e-posten.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    return NextResponse.json({
      message: "Hvis denne e-postadressen eksisterer, vil du motta en e-post med instruksjoner for å nullstille passordet.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error processing forgot password:", error)
    return NextResponse.json(
      { error: "Noe gikk galt. Prøv igjen senere." },
      { status: 500 }
    )
  }
}

