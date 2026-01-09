import { NextResponse } from "next/server"
import { z } from "zod"
import { calculateSuggestedPrice } from "@/lib/pricing"
import { logger } from "@/lib/logger"

const suggestPriceSchema = z.object({
  type: z.enum(["UTENDORS", "INNENDORS"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = suggestPriceSchema.parse(body)

    const suggestedPrice = calculateSuggestedPrice({
      type: validatedData.type,
      latitude: validatedData.latitude || 0,
      longitude: validatedData.longitude || 0,
    })

    return NextResponse.json({ suggestedPrice })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.error("Error suggesting price", error)
    return NextResponse.json(
      { error: "Kunne ikke foreslå pris" },
      { status: 500 }
    )
  }
}

