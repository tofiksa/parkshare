import QRCode from "qrcode"

/**
 * Genererer QR-kode for en parkeringsplass eller booking
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "M",
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
    return qrCodeDataURL
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw new Error("Kunne ikke generere QR-kode")
  }
}

/**
 * Genererer unik QR-kode streng for en parkeringsplass
 */
export function generateQRCodeString(parkingSpotId: string): string {
  return `PARKSHARE:${parkingSpotId}:${Date.now()}`
}

