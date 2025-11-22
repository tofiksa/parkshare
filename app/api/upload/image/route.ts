import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

/**
 * POST /api/upload/image
 * Upload image and return URL or base64 data URL
 * 
 * For MVP: Returns base64 data URL
 * For production: Should upload to cloud storage (Cloudinary, S3, etc.) and return URL
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "Ingen fil opplastet" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Ugyldig filtype. Kun JPEG, PNG og WebP er tillatt." },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Filen er for stor. Maksimal størrelse er 5MB." },
        { status: 400 }
      )
    }

    // Convert file to base64 data URL
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`

    // For MVP: Return base64 data URL
    // For production: Upload to cloud storage and return URL
    // Example with Cloudinary:
    // const cloudinary = require('cloudinary').v2
    // const result = await cloudinary.uploader.upload(dataUrl, {
    //   folder: 'parkshare',
    //   resource_type: 'image',
    // })
    // return NextResponse.json({ url: result.secure_url })

    return NextResponse.json({
      url: dataUrl,
      size: file.size,
      type: file.type,
      note: "For produksjon bør dette lastes opp til cloud storage (Cloudinary/S3)",
    })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json(
      { error: "Kunne ikke laste opp bilde" },
      { status: 500 }
    )
  }
}

