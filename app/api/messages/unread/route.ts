import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET - Hent antall uleste meldinger for innlogget bruker
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: session.user.id,
        read: false,
      },
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error("Error fetching unread messages:", error)
    return NextResponse.json(
      { error: "Kunne ikke hente uleste meldinger" },
      { status: 500 }
    )
  }
}

