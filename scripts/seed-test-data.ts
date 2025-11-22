import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starter seeding av testdata...")

  // Sjekk om test-utleier allerede eksisterer
  let landlord = await prisma.user.findUnique({
    where: { email: "utleier@test.no" },
  })

  if (!landlord) {
    // Opprett test-utleier
    const hashedPassword = await bcrypt.hash("test123456", 10)
    landlord = await prisma.user.create({
      data: {
        email: "utleier@test.no",
        password: hashedPassword,
        name: "Test Utleier",
        phone: "+47 123 45 678",
        userType: "UTLEIER",
      },
    })
    console.log("✅ Opprettet test-utleier:", landlord.email)
  } else {
    console.log("ℹ️  Test-utleier eksisterer allerede:", landlord.email)
  }

  // Slett eksisterende parkeringsplasser for denne utleieren (for å unngå duplikater)
  await prisma.parkingSpot.deleteMany({
    where: { userId: landlord.id },
  })
  console.log("🧹 Ryddet eksisterende parkeringsplasser")

  // Oslo sentrum koordinater (ca.)
  const osloCenter = { lat: 59.9139, lng: 10.7522 }

  // Opprett parkeringsplasser
  const parkingSpots = [
    // Utendørs plasser
    {
      type: "UTENDORS" as const,
      address: "Karl Johans gate 1, 0162 Oslo",
      latitude: osloCenter.lat + 0.001,
      longitude: osloCenter.lng + 0.001,
      pricePerHour: 25,
      description: "Sentrumsnær parkeringsplass ved Karl Johan. Perfekt for shopping og besøk.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
    },
    {
      type: "UTENDORS" as const,
      address: "Aker Brygge 10, 0250 Oslo",
      latitude: osloCenter.lat - 0.002,
      longitude: osloCenter.lng - 0.001,
      pricePerHour: 30,
      description: "Parkeringsplass ved Aker Brygge med utsikt over fjorden.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
    },
    {
      type: "UTENDORS" as const,
      address: "Grünerløkka 5, 0552 Oslo",
      latitude: osloCenter.lat + 0.003,
      longitude: osloCenter.lng + 0.002,
      pricePerHour: 20,
      description: "Rolig parkeringsplass på Grünerløkka. Nærme kafeer og restauranter.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
    },
    {
      type: "UTENDORS" as const,
      address: "Majorstuen 15, 0367 Oslo",
      latitude: osloCenter.lat + 0.004,
      longitude: osloCenter.lng + 0.003,
      pricePerHour: 22,
      description: "Parkeringsplass ved Majorstuen. Nærme kollektivtransport.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
    },
    // Innendørs plasser
    {
      type: "INNENDORS" as const,
      address: "Storgata 1, 0155 Oslo",
      latitude: null,
      longitude: null,
      pricePerHour: 35,
      description: "Sikker innendørs parkeringsplass i sentrum. Overvåket 24/7.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
    },
    {
      type: "INNENDORS" as const,
      address: "Bislett 3, 0170 Oslo",
      latitude: null,
      longitude: null,
      pricePerHour: 40,
      description: "Moderne innendørs parkeringsgarasje. Elektrisk lading tilgjengelig.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
    },
    {
      type: "INNENDORS" as const,
      address: "Frognerveien 20, 0260 Oslo",
      latitude: null,
      longitude: null,
      pricePerHour: 32,
      description: "Eksklusiv innendørs parkering i Frogner-området.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
    },
    {
      type: "UTENDORS" as const,
      address: "Sagene 8, 0456 Oslo",
      latitude: osloCenter.lat + 0.005,
      longitude: osloCenter.lng + 0.004,
      pricePerHour: 18,
      description: "Rimelig parkeringsplass på Sagene. Perfekt for lengre opphold.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
    },
  ]

  // Generer QR-koder for innendørs plasser
  const generateQRCodeString = (userId: string, spotIndex: number) => {
    return `PS-${userId.substring(0, 8)}-${spotIndex}-${Date.now()}`
  }

  const createdSpots = []
  for (let i = 0; i < parkingSpots.length; i++) {
    const spot = parkingSpots[i]
    const qrCode = spot.type === "INNENDORS" ? generateQRCodeString(landlord.id, i) : null

    const created = await prisma.parkingSpot.create({
      data: {
        userId: landlord.id,
        type: spot.type,
        address: spot.address,
        latitude: spot.latitude,
        longitude: spot.longitude,
        pricePerHour: spot.pricePerHour,
        description: spot.description,
        imageUrl: spot.imageUrl,
        qrCode: qrCode,
        isActive: spot.isActive,
      },
    })
    createdSpots.push(created)
    console.log(`✅ Opprettet parkeringsplass: ${spot.address} (${spot.type})`)
  }

  console.log(`\n✅ Opprettet ${createdSpots.length} parkeringsplasser`)
  console.log("\n📋 Testdata opprettet!")
  console.log("\n🔑 Test-utleier:")
  console.log("   Email: utleier@test.no")
  console.log("   Passord: test123456")
  console.log("\n💡 Du kan nå:")
  console.log("   1. Logge inn som leietaker (eller opprette ny leietaker-bruker)")
  console.log("   2. Søke etter parkeringsplasser på /dashboard/search")
  console.log("   3. Booke parkeringsplasser")
  console.log("   4. Se dine bookinger på /dashboard/bookings")
}

main()
  .catch((e) => {
    console.error("❌ Feil ved seeding:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

