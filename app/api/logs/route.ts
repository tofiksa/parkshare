import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

/**
 * GET /api/logs
 * Henter logger (kun for debugging i utviklingsmiljø)
 */
export async function GET(request: Request) {
  try {
    // I produksjon, kun tillat for autentiserte admin-brukere
    const session = await getServerSession(authOptions)
    
    // For nå, tillat kun i utviklingsmiljø
    const isDevelopment = process.env.NODE_ENV === "development"
    
    if (!isDevelopment && !session) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level") || "all" // "all", "error", "warn", "info"
    const limit = parseInt(searchParams.get("limit") || "100")

    // I en ekte applikasjon ville du hente logger fra en logging-tjeneste
    // For nå returnerer vi en tom liste eller en melding
    return NextResponse.json({
      message: "Logging endpoint er tilgjengelig",
      environment: process.env.NODE_ENV,
      note: "I produksjon bør dette integreres med en logging-tjeneste som Sentry, LogRocket, eller lignende",
      logs: [],
      filters: {
        level,
        limit,
      },
    })
  } catch (error) {
    logger.error("Error fetching logs", error)
    return NextResponse.json(
      { error: "Kunne ikke hente logger" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/logs
 * Sender en log-melding (for klient-side logging)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { level, message, data } = body

    // Valider input
    if (!level || !message) {
      return NextResponse.json(
        { error: "Level og message er påkrevd" },
        { status: 400 }
      )
    }

    // Log til server logger
    const logMessage = `[${level.toUpperCase()}] ${message}`
    if (level === "error") {
      logger.error(logMessage, undefined, data)
    } else if (level === "warn") {
      logger.warn(logMessage, data)
    } else if (level === "info") {
      logger.info(logMessage, data)
    } else {
      logger.debug(logMessage, data)
    }

    return NextResponse.json({
      success: true,
      message: "Log melding mottatt",
    })
  } catch (error) {
    logger.error("Error posting log", error)
    return NextResponse.json(
      { error: "Kunne ikke sende log melding" },
      { status: 500 }
    )
  }
}

