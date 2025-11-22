import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    if (!process.env.RESEND_API_KEY) {
      if (process.env.NODE_ENV === "development") {
        console.warn("RESEND_API_KEY ikke satt - e-post vil ikke bli sendt")
        console.info("Would send email:", { to, subject })
      }
      return { success: false, error: "RESEND_API_KEY ikke konfigurert" }
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML tags for text version
    })

    if (error) {
      console.error("Error sending email:", error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error: error instanceof Error ? error.message : "Ukjent feil" }
  }
}

// E-post templates
export function getBookingConfirmationEmail(
  recipientName: string,
  bookingDetails: {
    address: string
    startTime: string
    endTime: string
    totalPrice: number
    type: "UTENDORS" | "INNENDORS"
    qrCode?: string | null
  }
) {
  const startDate = new Date(bookingDetails.startTime).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  const endDate = new Date(bookingDetails.endTime).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return {
    subject: "Booking bekreftet - Parkshare",
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
            .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
            .price { font-size: 24px; font-weight: bold; color: #2563eb; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Booking bekreftet!</h1>
            </div>
            <div class="content">
              <p>Hei ${recipientName},</p>
              <p>Din booking er bekreftet! Her er detaljene:</p>
              
              <div class="info-box">
                <h2>${bookingDetails.address}</h2>
                <p><strong>Type:</strong> ${bookingDetails.type === "UTENDORS" ? "Utendørs" : "Innendørs/Garasje"}</p>
                <p><strong>Starttid:</strong> ${startDate}</p>
                <p><strong>Sluttid:</strong> ${endDate}</p>
                <p class="price">Totalpris: ${bookingDetails.totalPrice.toFixed(2)} NOK</p>
              </div>

              ${bookingDetails.type === "INNENDORS" && bookingDetails.qrCode ? `
                <div class="info-box">
                  <h3>QR-kode for tilgang</h3>
                  <p>Din QR-kode: <strong>${bookingDetails.qrCode}</strong></p>
                  <p>Vennligst vis denne QR-koden ved ankomst for å få tilgang til parkeringsplassen.</p>
                </div>
              ` : ""}

              <p>Du kan se alle dine bookinger og kommunisere med utleier i dashboardet ditt.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/bookings" class="button">Se mine bookinger</a>
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
  }
}

export function getCancellationEmail(
  recipientName: string,
  bookingDetails: {
    address: string
    startTime: string
    totalPrice: number
  }
) {
  const startDate = new Date(bookingDetails.startTime).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return {
    subject: "Booking avbestilt - Parkshare",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc2626; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking avbestilt</h1>
            </div>
            <div class="content">
              <p>Hei ${recipientName},</p>
              <p>Din booking har blitt avbestilt.</p>
              
              <div class="info-box">
                <h2>${bookingDetails.address}</h2>
                <p><strong>Planlagt starttid:</strong> ${startDate}</p>
                <p><strong>Refundert beløp:</strong> ${bookingDetails.totalPrice.toFixed(2)} NOK</p>
              </div>

              <p>Refunderingen vil bli behandlet automatisk og skal være tilbake på ditt betalingskort innen 5-7 virkedager.</p>
              
              <p>Hvis du har spørsmål, kan du kontakte oss gjennom appen.</p>
            </div>
            <div class="footer">
              <p>Parkshare - Din parkeringsløsning</p>
              <p>Denne e-posten ble sendt automatisk. Vennligst ikke svar på denne e-posten.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }
}

export function getNewMessageEmail(
  recipientName: string,
  senderName: string,
  bookingDetails: {
    address: string
    bookingId: string
  },
  messagePreview: string
) {
  return {
    subject: `Ny melding om booking på ${bookingDetails.address}`,
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
            .message-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 Ny melding</h1>
            </div>
            <div class="content">
              <p>Hei ${recipientName},</p>
              <p>Du har mottatt en ny melding fra ${senderName} om bookingen på:</p>
              
              <div class="message-box">
                <h2>${bookingDetails.address}</h2>
                <p><strong>Melding:</strong></p>
                <p>${messagePreview}</p>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/bookings/${bookingDetails.bookingId}" class="button">Se melding</a>
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
  }
}

export function getBookingReminderEmail(
  recipientName: string,
  bookingDetails: {
    address: string
    startTime: string
    endTime: string
    type: "UTENDORS" | "INNENDORS"
    qrCode?: string | null
    latitude?: number | null
    longitude?: number | null
  }
) {
  const startDate = new Date(bookingDetails.startTime).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return {
    subject: "Påminnelse: Din booking starter snart - Parkshare",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Påminnelse</h1>
            </div>
            <div class="content">
              <p>Hei ${recipientName},</p>
              <p>Din booking starter om 1 time!</p>
              
              <div class="info-box">
                <h2>${bookingDetails.address}</h2>
                <p><strong>Starttid:</strong> ${startDate}</p>
                ${bookingDetails.type === "INNENDORS" && bookingDetails.qrCode ? `
                  <p><strong>QR-kode:</strong> ${bookingDetails.qrCode}</p>
                ` : ""}
                ${bookingDetails.type === "UTENDORS" && bookingDetails.latitude && bookingDetails.longitude ? `
                  <p><strong>GPS-koordinater:</strong> ${bookingDetails.latitude.toFixed(6)}, ${bookingDetails.longitude.toFixed(6)}</p>
                ` : ""}
              </div>

              <p>Husk å ha QR-koden klar hvis det er en innendørs plass, eller følg GPS-koordinatene for utendørs plasser.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/bookings" class="button">Se bookingdetaljer</a>
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
  }
}

