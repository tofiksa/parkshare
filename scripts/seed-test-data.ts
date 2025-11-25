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

  // Trondheim sentrum koordinater (ca.)
  const trondheimCenter = { lat: 63.4305, lng: 10.3951 }

  // Hjelpefunksjon for å beregne rektangel-koordinater fra senter og størrelse
  const calculateRectBounds = (
    centerLat: number,
    centerLng: number,
    widthMeters: number,
    heightMeters: number
  ) => {
    // Omtrentlig konvertering: 1 grad lat ≈ 111 km, 1 grad lng ≈ 111 km * cos(lat)
    const latOffset = heightMeters / 111000 / 2
    const lngOffset = widthMeters / (111000 * Math.cos(centerLat * Math.PI / 180)) / 2
    
    return {
      rectNorthLat: centerLat + latOffset,
      rectSouthLat: centerLat - latOffset,
      rectEastLng: centerLng + lngOffset,
      rectWestLng: centerLng - lngOffset,
      rectWidthMeters: widthMeters,
      rectHeightMeters: heightMeters,
    }
  }

  // Opprett parkeringsplasser med varierende konfigurasjoner
  const parkingSpots = [
    // Utendørs plasser med ON_DEMAND støtte
    {
      type: "UTENDORS" as const,
      address: "Karl Johans gate 1, 0162 Oslo",
      latitude: osloCenter.lat + 0.001,
      longitude: osloCenter.lng + 0.001,
      pricePerHour: 25,
      description: "Sentrumsnær parkeringsplass ved Karl Johan. Perfekt for shopping og besøk.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1720",
      zoneName: "Karl Johan",
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
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1721",
      zoneName: "Aker Brygge",
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
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1722",
      zoneName: "Grünerløkka",
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
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1723",
      zoneName: "Majorstuen",
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
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1724",
      zoneName: "Sagene",
    },
    // Utendørs plass kun med ADVANCE booking (for testing)
    {
      type: "UTENDORS" as const,
      address: "Torshov 12, 0484 Oslo",
      latitude: osloCenter.lat + 0.006,
      longitude: osloCenter.lng + 0.005,
      pricePerHour: 19,
      description: "Parkeringsplass på Torshov. Kun forhåndsbooking.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: false,
      zoneNumber: "1725",
      zoneName: "Torshov",
    },
    // Innendørs plasser (kun ADVANCE)
    {
      type: "INNENDORS" as const,
      address: "Storgata 1, 0155 Oslo",
      latitude: null,
      longitude: null,
      pricePerHour: 35,
      description: "Sikker innendørs parkeringsplass i sentrum. Overvåket 24/7.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: false,
      zoneNumber: null,
      zoneName: null,
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
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: false,
      zoneNumber: null,
      zoneName: null,
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
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: false,
      zoneNumber: null,
      zoneName: null,
    },
    // Inaktiv plass (for testing)
    {
      type: "UTENDORS" as const,
      address: "Gamle Oslo 5, 0190 Oslo",
      latitude: osloCenter.lat - 0.003,
      longitude: osloCenter.lng - 0.002,
      pricePerHour: 15,
      description: "Inaktiv parkeringsplass (for testing).",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: false,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1726",
      zoneName: "Gamle Oslo",
    },
    // Trondheim parkeringsplasser
    {
      type: "UTENDORS" as const,
      address: "Munkegata 1, 7030 Trondheim",
      latitude: trondheimCenter.lat + 0.001,
      longitude: trondheimCenter.lng + 0.001,
      pricePerHour: 22,
      description: "Sentrumsnær parkeringsplass ved Munkegata. Perfekt for besøk i Trondheim sentrum.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "7001",
      zoneName: "Trondheim Sentrum",
      operator: "Trondheim Parkering AS",
    },
    {
      type: "UTENDORS" as const,
      address: "Kongens gate 15, 7011 Trondheim",
      latitude: trondheimCenter.lat + 0.002,
      longitude: trondheimCenter.lng - 0.001,
      pricePerHour: 20,
      description: "Parkeringsplass ved Kongens gate. Nær Nidarosdomen og Torvet.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "7002",
      zoneName: "Kongens gate",
      operator: "Trondheim Parkering AS",
    },
    {
      type: "UTENDORS" as const,
      address: "Dronning Blanca gate 8, 7030 Trondheim",
      latitude: trondheimCenter.lat - 0.001,
      longitude: trondheimCenter.lng + 0.002,
      pricePerHour: 18,
      description: "Rimelig parkeringsplass i sentrum. Perfekt for shopping og besøk.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "7003",
      zoneName: "Dronning Blanca",
      operator: "Trondheim Parkering AS",
    },
    {
      type: "UTENDORS" as const,
      address: "Olav Tryggvasons gate 10, 7011 Trondheim",
      latitude: trondheimCenter.lat + 0.003,
      longitude: trondheimCenter.lng + 0.001,
      pricePerHour: 24,
      description: "Parkeringsplass ved Olav Tryggvasons gate. Nær NTNU og sentrum.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "7004",
      zoneName: "Olav Tryggvasons gate",
      operator: "Trondheim Parkering AS",
    },
    {
      type: "UTENDORS" as const,
      address: "Prinsens gate 5, 7011 Trondheim",
      latitude: trondheimCenter.lat - 0.002,
      longitude: trondheimCenter.lng - 0.001,
      pricePerHour: 19,
      description: "Parkeringsplass ved Prinsens gate. Perfekt for besøk på NTNU eller i sentrum.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "7005",
      zoneName: "Prinsens gate",
      operator: "Trondheim Parkering AS",
    },
    {
      type: "UTENDORS" as const,
      address: "Sverres gate 12, 7012 Trondheim",
      latitude: trondheimCenter.lat + 0.004,
      longitude: trondheimCenter.lng - 0.002,
      pricePerHour: 17,
      description: "Rimelig parkeringsplass på Sverres gate. Nær Lade og sentrum.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "7006",
      zoneName: "Sverres gate",
      operator: "Trondheim Parkering AS",
    },
    {
      type: "UTENDORS" as const,
      address: "Bispegata 8, 7013 Trondheim",
      latitude: trondheimCenter.lat - 0.003,
      longitude: trondheimCenter.lng + 0.003,
      pricePerHour: 21,
      description: "Parkeringsplass ved Bispegata. Nær Nidarosdomen og sentrum.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "7007",
      zoneName: "Bispegata",
      operator: "Trondheim Parkering AS",
    },
    {
      type: "INNENDORS" as const,
      address: "Solsiden 1, 7010 Trondheim",
      latitude: null,
      longitude: null,
      pricePerHour: 30,
      description: "Moderne innendørs parkeringsgarasje ved Solsiden. Overvåket 24/7.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: false,
      zoneNumber: null,
      zoneName: null,
      operator: "Trondheim Parkering AS",
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

    // Beregn pricePerMinute
    const pricePerMinute = spot.pricePerHour / 60

    // Hjelpefunksjon for å bestemme zoneName
    const getZoneName = (): string | null => {
      if (spot.zoneName) return spot.zoneName
      if (spot.type === "UTENDORS" && spot.address) {
        return spot.address.split(",")[0]
      }
      return null
    }

    // Hjelpefunksjon for å bestemme zoneNumber
    const getZoneNumber = (): string | null => {
      if (spot.zoneNumber) return spot.zoneNumber
      if (spot.type === "UTENDORS") {
        return `17${i + 1}0`
      }
      return null
    }

    // Beregn rektangel-koordinater hvis vi har koordinater
    let rectData: {
      rectNorthLat?: number | null
      rectSouthLat?: number | null
      rectEastLng?: number | null
      rectWestLng?: number | null
      rectWidthMeters?: number | null
      rectHeightMeters?: number | null
    } = {}

    if (spot.latitude !== null && spot.longitude !== null) {
      // Variabel størrelse basert på parkeringsplass-type og indeks
      // Utendørs: større (10-20 meter), Innendørs: mindre (5-10 meter)
      const baseWidth = spot.type === "UTENDORS" ? 15 + (i % 5) * 2 : 8 + (i % 3)
      const baseHeight = spot.type === "UTENDORS" ? 12 + (i % 4) * 2 : 6 + (i % 2)
      
      const rectBounds = calculateRectBounds(
        spot.latitude,
        spot.longitude,
        baseWidth,
        baseHeight
      )
      rectData = rectBounds
    }

    const created = await prisma.parkingSpot.create({
      data: {
        userId: landlord.id,
        type: spot.type,
        address: spot.address,
        latitude: spot.latitude,
        longitude: spot.longitude,
        pricePerHour: spot.pricePerHour,
        pricePerMinute: pricePerMinute,
        description: spot.description,
        imageUrl: spot.imageUrl,
        qrCode: qrCode,
        isActive: spot.isActive,
        supportsAdvanceBooking: spot.supportsAdvanceBooking ?? true,
        supportsOnDemandBooking: spot.supportsOnDemandBooking ?? (spot.latitude !== null && spot.longitude !== null),
        gpsToleranceMeters: 50,
        zoneNumber: getZoneNumber(),
        zoneName: getZoneName(),
        operator: spot.operator ?? "Parkshare Test AS",
        ...rectData,
      },
    })
    createdSpots.push(created)
    console.log(`✅ Opprettet parkeringsplass: ${spot.address} (${spot.type})`)
  }

  // Opprett flere test-leietakere
  const tenants = []
  const tenantData = [
    {
      email: "leietaker@test.no",
      name: "Test Leietaker",
      phone: "+47 987 65 432",
    },
    {
      email: "leietaker2@test.no",
      name: "Test Leietaker 2",
      phone: "+47 987 65 433",
    },
    {
      email: "leietaker3@test.no",
      name: "Test Leietaker 3",
      phone: "+47 987 65 434",
    },
  ]

  for (const tenantInfo of tenantData) {
    let tenant = await prisma.user.findUnique({
      where: { email: tenantInfo.email },
    })

    if (!tenant) {
      const hashedPassword = await bcrypt.hash("test123456", 10)
      tenant = await prisma.user.create({
        data: {
          email: tenantInfo.email,
          password: hashedPassword,
          name: tenantInfo.name,
          phone: tenantInfo.phone,
          userType: "LEIETAKER",
        },
      })
      console.log("✅ Opprettet test-leietaker:", tenant.email)
    } else {
      console.log("ℹ️  Test-leietaker eksisterer allerede:", tenant.email)
    }
    tenants.push(tenant)
  }

  const mainTenant = tenants[0] // Bruk første leietaker for bookinger

  // Slett eksisterende bookinger for å unngå duplikater
  await prisma.booking.deleteMany({})
  await prisma.payment.deleteMany({})
  console.log("🧹 Ryddet eksisterende bookinger og betalinger")

  // Opprett eksisterende bookinger for testing
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(now)
  lastWeek.setDate(lastWeek.getDate() - 7)
  const twoHoursAgo = new Date(now)
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)
  const oneHourAgo = new Date(now)
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)

  // ADVANCE bookinger
  const advanceBookings = [
    {
      parkingSpot: createdSpots[0], // Karl Johan
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000), // 2 timer
      status: "PENDING" as const,
      totalPrice: 50, // 25 NOK/time * 2 timer
    },
    {
      parkingSpot: createdSpots[1], // Aker Brygge
      startTime: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000), // I morgen + 1 dag
      endTime: new Date(tomorrow.getTime() + 26 * 60 * 60 * 1000), // 2 timer senere
      status: "CONFIRMED" as const,
      totalPrice: 60, // 30 NOK/time * 2 timer
    },
    {
      parkingSpot: createdSpots[2], // Grünerløkka
      startTime: yesterday,
      endTime: new Date(yesterday.getTime() + 3 * 60 * 60 * 1000), // 3 timer
      status: "COMPLETED" as const,
      totalPrice: 60, // 20 NOK/time * 3 timer
    },
    {
      parkingSpot: createdSpots[6], // Storgata (innendørs)
      startTime: lastWeek,
      endTime: new Date(lastWeek.getTime() + 4 * 60 * 60 * 1000), // 4 timer
      status: "COMPLETED" as const,
      totalPrice: 140, // 35 NOK/time * 4 timer
    },
  ]

  const createdBookings = []
  for (const bookingData of advanceBookings) {
    const booking = await prisma.booking.create({
      data: {
        parkingSpotId: bookingData.parkingSpot.id,
        userId: mainTenant.id,
        bookingType: "ADVANCE",
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        totalPrice: bookingData.totalPrice,
        status: bookingData.status,
        qrCode: `QR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      },
    })
    createdBookings.push(booking)

    // Opprett payment for completed bookinger
    if (bookingData.status === "COMPLETED") {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: bookingData.totalPrice,
          currency: "NOK",
          status: "COMPLETED",
          paymentType: "ADVANCE",
        },
      })
    } else if (bookingData.status === "CONFIRMED") {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: bookingData.totalPrice,
          currency: "NOK",
          status: "COMPLETED",
          paymentType: "ADVANCE",
        },
      })
    }
  }

  // ON_DEMAND bookinger
  const onDemandBookings = [
    {
      parkingSpot: createdSpots[3], // Majorstuen
      actualStartTime: twoHoursAgo,
      status: "STARTED" as const,
      vehiclePlate: "EV42193",
      gpsStartLat: createdSpots[3].latitude!,
      gpsStartLng: createdSpots[3].longitude!,
    },
    {
      parkingSpot: createdSpots[4], // Sagene
      actualStartTime: oneHourAgo,
      actualEndTime: now,
      status: "COMPLETED" as const,
      vehiclePlate: "AB12345",
      durationMinutes: 60,
      totalPrice: 18, // 18 NOK/time = 0.3 NOK/min * 60 min
      gpsStartLat: createdSpots[4].latitude!,
      gpsStartLng: createdSpots[4].longitude!,
      gpsEndLat: createdSpots[4].latitude!,
      gpsEndLng: createdSpots[4].longitude!,
    },
  ]

  for (const bookingData of onDemandBookings) {
    const booking = await prisma.booking.create({
      data: {
        parkingSpotId: bookingData.parkingSpot.id,
        userId: mainTenant.id,
        bookingType: "ON_DEMAND",
        startTime: bookingData.actualStartTime,
        endTime: bookingData.actualEndTime || null,
        actualStartTime: bookingData.actualStartTime,
        actualEndTime: bookingData.actualEndTime || null,
        totalPrice: bookingData.totalPrice || null,
        durationMinutes: bookingData.durationMinutes || null,
        status: bookingData.status,
        vehiclePlate: bookingData.vehiclePlate,
        gpsStartLat: bookingData.gpsStartLat,
        gpsStartLng: bookingData.gpsStartLng,
        gpsEndLat: bookingData.gpsEndLat || null,
        gpsEndLng: bookingData.gpsEndLng || null,
        estimatedPrice: bookingData.status === "STARTED" ? 36 : null, // 0.3 NOK/min * 120 min
      },
    })
    createdBookings.push(booking)

    // Opprett payment for completed ON_DEMAND booking
    if (bookingData.status === "COMPLETED" && bookingData.totalPrice) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: bookingData.totalPrice,
          currency: "NOK",
          status: "PENDING", // Venter på betaling
          paymentType: "ON_DEMAND",
        },
      })
    }
  }

  console.log(`✅ Opprettet ${createdBookings.length} test-bookinger`)
  console.log(`   - ${advanceBookings.length} ADVANCE bookinger`)
  console.log(`   - ${onDemandBookings.length} ON_DEMAND bookinger`)
  console.log(`   - 1 aktiv STARTED booking (kan testes med /dashboard/parking/active)`)

  console.log(`\n✅ Opprettet ${createdSpots.length} parkeringsplasser`)
  console.log("\n📋 Testdata opprettet!")
  console.log("\n🔑 Test-brukere:")
  console.log("\n   Utleier:")
  console.log("   Email: utleier@test.no")
  console.log("   Passord: test123456")
  console.log("\n   Leietakere (alle har samme passord: test123456):")
  for (const tenant of tenants) {
    console.log(`   - ${tenant.email} (${tenant.name})`)
  }
  console.log("\n💡 Du kan nå teste:")
  console.log("   1. Logge inn som leietaker (leietaker@test.no)")
  console.log("   2. Se aktiv STARTED booking på /dashboard/parking/active")
  console.log("   3. Se alle bookinger på /dashboard/bookings")
  console.log("   4. Teste start/stop parkering på /dashboard/parking/map")
  console.log("   5. Søke etter parkeringsplasser på /dashboard/search")
  console.log("   6. Booke nye parkeringsplasser (ADVANCE)")
  console.log("   7. Logge inn som utleier for å se inntekter på /dashboard/revenue")
}

main()
  .catch((e) => {
    console.error("❌ Feil ved seeding:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

