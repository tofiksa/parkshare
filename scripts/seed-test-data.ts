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
  
  // Område-koordinater
  const sognsvann = { lat: 59.9800, lng: 10.7300 } // Sognsvann
  const lørenskog = { lat: 59.9300, lng: 10.9500 } // Lørenskog
  const furuset = { lat: 59.9500, lng: 10.8000 } // Furuset
  const høybråten = { lat: 59.9400, lng: 10.8500 } // Høybråten
  const strømmen = { lat: 59.9600, lng: 11.0000 } // Strømmen

  // Hjelpefunksjon for å beregne punkt fra senter med avstand og bearing (vinkel)
  const calculatePoint = (
    centerLat: number,
    centerLng: number,
    distanceMeters: number,
    bearingDegrees: number
  ): [number, number] => {
    const R = 6371000 // Jordens radius i meter
    const lat1 = centerLat * Math.PI / 180
    const lng1 = centerLng * Math.PI / 180
    const bearing = bearingDegrees * Math.PI / 180
    const d = distanceMeters / R

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
    )
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )

    return [lat2 * 180 / Math.PI, lng2 * 180 / Math.PI]
  }

  // Hjelpefunksjon for å beregne polygon-koordinater (fire hjørnepunkter) langs veien
  // For utendørs: rektangel orientert langs veien (lengre langs veien, smalere på tvers)
  // For innendørs: standard rektangel i garasje
  const calculatePolygonCorners = (
    centerLat: number,
    centerLng: number,
    lengthAlongRoadMeters: number, // Lengde langs veien
    widthAcrossRoadMeters: number, // Bredde på tvers av veien
    roadBearingDegrees: number, // Vinkel for veiens retning (0 = nord, 90 = øst, 180 = sør, 270 = vest)
    type: "UTENDORS" | "INNENDORS"
  ) => {
    // For utendørs: rektangel skal være lengre langs veien
    // For innendørs: standard kvadratisk/rektangulær
    const halfLength = lengthAlongRoadMeters / 2  // Halv lengde langs veien
    const halfWidth = widthAcrossRoadMeters / 2    // Halv bredde på tvers

    // Beregn fire hjørnepunkter
    // Rektangel orientert langs veien: lengden går langs bearing-retningen, bredden går på tvers
    // Start fra senter, gå halv lengde langs veien, deretter halv bredde på tvers
    
    // Hjørne 1: foran-venstre (langs veien + på tvers venstre)
    const pointAlong1 = calculatePoint(centerLat, centerLng, halfLength, roadBearingDegrees)
    const corner1 = calculatePoint(pointAlong1[0], pointAlong1[1], halfWidth, roadBearingDegrees + 90)
    
    // Hjørne 2: foran-høyre (langs veien + på tvers høyre)
    const pointAlong2 = calculatePoint(centerLat, centerLng, halfLength, roadBearingDegrees)
    const corner2 = calculatePoint(pointAlong2[0], pointAlong2[1], halfWidth, roadBearingDegrees - 90)
    
    // Hjørne 3: bak-høyre (motsatt langs veien + på tvers høyre)
    const pointAlong3 = calculatePoint(centerLat, centerLng, halfLength, roadBearingDegrees + 180)
    const corner3 = calculatePoint(pointAlong3[0], pointAlong3[1], halfWidth, roadBearingDegrees - 90)
    
    // Hjørne 4: bak-venstre (motsatt langs veien + på tvers venstre)
    const pointAlong4 = calculatePoint(centerLat, centerLng, halfLength, roadBearingDegrees + 180)
    const corner4 = calculatePoint(pointAlong4[0], pointAlong4[1], halfWidth, roadBearingDegrees + 90)

    return {
      rectCorner1Lat: corner1[0],
      rectCorner1Lng: corner1[1],
      rectCorner2Lat: corner2[0],
      rectCorner2Lng: corner2[1],
      rectCorner3Lat: corner3[0],
      rectCorner3Lng: corner3[1],
      rectCorner4Lat: corner4[0],
      rectCorner4Lng: corner4[1],
      // Behold også bounds for bakoverkompatibilitet
      rectNorthLat: Math.max(corner1[0], corner2[0], corner3[0], corner4[0]),
      rectSouthLat: Math.min(corner1[0], corner2[0], corner3[0], corner4[0]),
      rectEastLng: Math.max(corner1[1], corner2[1], corner3[1], corner4[1]),
      rectWestLng: Math.min(corner1[1], corner2[1], corner3[1], corner4[1]),
      rectWidthMeters: widthAcrossRoadMeters,
      rectHeightMeters: lengthAlongRoadMeters,
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
    // Innendørs plasser (kun ADVANCE) - med koordinater for garasje-visning
    {
      type: "INNENDORS" as const,
      address: "Storgata 1, 0155 Oslo",
      latitude: osloCenter.lat - 0.001,
      longitude: osloCenter.lng + 0.002,
      pricePerHour: 35,
      description: "Sikker innendørs parkeringsgarasje i sentrum. Overvåket 24/7.",
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
      latitude: osloCenter.lat + 0.002,
      longitude: osloCenter.lng - 0.002,
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
      latitude: osloCenter.lat + 0.003,
      longitude: osloCenter.lng - 0.003,
      pricePerHour: 32,
      description: "Eksklusiv innendørs parkeringsgarasje i Frogner-området.",
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
      latitude: trondheimCenter.lat - 0.001,
      longitude: trondheimCenter.lng - 0.002,
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
    // Nye parkeringsplasser - Oslo
    {
      type: "UTENDORS" as const,
      address: "Stortingsgata 5, 0161 Oslo",
      latitude: osloCenter.lat + 0.0005,
      longitude: osloCenter.lng + 0.0005,
      pricePerHour: 28,
      description: "Parkeringsplass langs Stortingsgata. Sentrumsnær og praktisk.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1727",
      zoneName: "Stortingsgata",
    },
    {
      type: "UTENDORS" as const,
      address: "Rådhusgata 8, 0151 Oslo",
      latitude: osloCenter.lat - 0.0008,
      longitude: osloCenter.lng + 0.0008,
      pricePerHour: 26,
      description: "Parkeringsplass ved Rådhusgata. Nær Rådhuset og Aker Brygge.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1728",
      zoneName: "Rådhusgata",
    },
    {
      type: "UTENDORS" as const,
      address: "Bogstadveien 15, 0355 Oslo",
      latitude: osloCenter.lat + 0.0055,
      longitude: osloCenter.lng + 0.0035,
      pricePerHour: 24,
      description: "Parkeringsplass langs Bogstadveien. Perfekt for shopping.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1729",
      zoneName: "Bogstadveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Thorvald Meyers gate 20, 0552 Oslo",
      latitude: osloCenter.lat + 0.0035,
      longitude: osloCenter.lng + 0.0025,
      pricePerHour: 21,
      description: "Parkeringsplass på Grünerløkka langs Thorvald Meyers gate.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1730",
      zoneName: "Thorvald Meyers gate",
    },
    {
      type: "UTENDORS" as const,
      address: "Frognerveien 25, 0260 Oslo",
      latitude: osloCenter.lat + 0.0045,
      longitude: osloCenter.lng - 0.0025,
      pricePerHour: 27,
      description: "Parkeringsplass langs Frognerveien. Eksklusivt område.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1731",
      zoneName: "Frognerveien",
    },
    {
      type: "INNENDORS" as const,
      address: "Karl Johans gate 25, 0162 Oslo",
      latitude: osloCenter.lat + 0.0015,
      longitude: osloCenter.lng + 0.0015,
      pricePerHour: 38,
      description: "Innendørs parkeringsgarasje ved Karl Johan. Sentrumsnær og sikker.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: false,
      zoneNumber: null,
      zoneName: null,
    },
    {
      type: "INNENDORS" as const,
      address: "Aker Brygge 15, 0250 Oslo",
      latitude: osloCenter.lat - 0.0025,
      longitude: osloCenter.lng - 0.0015,
      pricePerHour: 42,
      description: "Moderne parkeringsgarasje ved Aker Brygge. Overvåket og sikker.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: false,
      zoneNumber: null,
      zoneName: null,
    },
    // Nye parkeringsplasser - Trondheim
    {
      type: "UTENDORS" as const,
      address: "Dronning Blanca gate 12, 7030 Trondheim",
      latitude: trondheimCenter.lat - 0.0005,
      longitude: trondheimCenter.lng + 0.0025,
      pricePerHour: 20,
      description: "Parkeringsplass langs Dronning Blanca gate. Sentrumsnær.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "7008",
      zoneName: "Dronning Blanca gate",
      operator: "Trondheim Parkering AS",
    },
    {
      type: "UTENDORS" as const,
      address: "Kjøpmannsgata 10, 7011 Trondheim",
      latitude: trondheimCenter.lat + 0.0015,
      longitude: trondheimCenter.lng + 0.0005,
      pricePerHour: 23,
      description: "Parkeringsplass langs Kjøpmannsgata. Nær sentrum og butikker.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "7009",
      zoneName: "Kjøpmannsgata",
      operator: "Trondheim Parkering AS",
    },
    {
      type: "INNENDORS" as const,
      address: "Munkegata 5, 7030 Trondheim",
      latitude: trondheimCenter.lat + 0.002,
      longitude: trondheimCenter.lng + 0.001,
      pricePerHour: 32,
      description: "Innendørs parkeringsgarasje ved Munkegata. Sentrumsnær og sikker.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: false,
      zoneNumber: null,
      zoneName: null,
      operator: "Trondheim Parkering AS",
    },
    // Nye parkeringsplasser - Sognsvann området
    {
      type: "UTENDORS" as const,
      address: "Sognsveien 20, 0855 Oslo",
      latitude: sognsvann.lat - 0.001,
      longitude: sognsvann.lng + 0.0005,
      pricePerHour: 18,
      description: "Parkeringsplass langs Sognsveien ved Sognsvann. Perfekt for turer i naturen.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1732",
      zoneName: "Sognsveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Sognsveien 35, 0855 Oslo",
      latitude: sognsvann.lat - 0.0005,
      longitude: sognsvann.lng + 0.0008,
      pricePerHour: 18,
      description: "Parkeringsplass langs Sognsveien. Nærme Sognsvann og idrettsanlegg.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1733",
      zoneName: "Sognsveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Sognsveien 50, 0855 Oslo",
      latitude: sognsvann.lat,
      longitude: sognsvann.lng + 0.001,
      pricePerHour: 19,
      description: "Parkeringsplass langs Sognsveien. Nærme Sognsvann og turstier.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1734",
      zoneName: "Sognsveien",
    },
    // Nye parkeringsplasser - Lørenskog
    {
      type: "UTENDORS" as const,
      address: "Lørenskogveien 10, 1470 Lørenskog",
      latitude: lørenskog.lat - 0.0005,
      longitude: lørenskog.lng - 0.0005,
      pricePerHour: 16,
      description: "Parkeringsplass langs Lørenskogveien. Sentrumsnær i Lørenskog.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1735",
      zoneName: "Lørenskogveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Lørenskogveien 25, 1470 Lørenskog",
      latitude: lørenskog.lat,
      longitude: lørenskog.lng,
      pricePerHour: 17,
      description: "Parkeringsplass langs Lørenskogveien. Nærme butikker og tjenester.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1736",
      zoneName: "Lørenskogveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Storgata 5, 1470 Lørenskog",
      latitude: lørenskog.lat + 0.0005,
      longitude: lørenskog.lng + 0.0005,
      pricePerHour: 18,
      description: "Parkeringsplass langs Storgata i Lørenskog sentrum.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1737",
      zoneName: "Storgata Lørenskog",
    },
    // Nye parkeringsplasser - Furuset
    {
      type: "UTENDORS" as const,
      address: "Furusetveien 15, 0963 Oslo",
      latitude: furuset.lat - 0.0005,
      longitude: furuset.lng - 0.0005,
      pricePerHour: 17,
      description: "Parkeringsplass langs Furusetveien. Nærme Furuset senter.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1738",
      zoneName: "Furusetveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Furusetveien 30, 0963 Oslo",
      latitude: furuset.lat,
      longitude: furuset.lng,
      pricePerHour: 18,
      description: "Parkeringsplass langs Furusetveien. Nærme kollektivtransport.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1739",
      zoneName: "Furusetveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Furusetveien 45, 0963 Oslo",
      latitude: furuset.lat + 0.0005,
      longitude: furuset.lng + 0.0005,
      pricePerHour: 17,
      description: "Parkeringsplass langs Furusetveien. Perfekt for besøk i området.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1740",
      zoneName: "Furusetveien",
    },
    // Nye parkeringsplasser - Høybråten
    {
      type: "UTENDORS" as const,
      address: "Høybråtenveien 8, 0975 Oslo",
      latitude: høybråten.lat - 0.0005,
      longitude: høybråten.lng - 0.0005,
      pricePerHour: 16,
      description: "Parkeringsplass langs Høybråtenveien. Nærme Høybråten senter.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1741",
      zoneName: "Høybråtenveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Høybråtenveien 20, 0975 Oslo",
      latitude: høybråten.lat,
      longitude: høybråten.lng,
      pricePerHour: 17,
      description: "Parkeringsplass langs Høybråtenveien. Nærme butikker og tjenester.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1742",
      zoneName: "Høybråtenveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Høybråtenveien 35, 0975 Oslo",
      latitude: høybråten.lat + 0.0005,
      longitude: høybråten.lng + 0.0005,
      pricePerHour: 16,
      description: "Parkeringsplass langs Høybråtenveien. Perfekt for besøk i området.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1743",
      zoneName: "Høybråtenveien",
    },
    // Nye parkeringsplasser - Strømmen
    {
      type: "UTENDORS" as const,
      address: "Strømmenveien 10, 2010 Strømmen",
      latitude: strømmen.lat - 0.0005,
      longitude: strømmen.lng - 0.0005,
      pricePerHour: 15,
      description: "Parkeringsplass langs Strømmenveien. Nærme Strømmen senter.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1744",
      zoneName: "Strømmenveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Strømmenveien 25, 2010 Strømmen",
      latitude: strømmen.lat,
      longitude: strømmen.lng,
      pricePerHour: 16,
      description: "Parkeringsplass langs Strømmenveien. Nærme butikker og tjenester.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1745",
      zoneName: "Strømmenveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Strømmenveien 40, 2010 Strømmen",
      latitude: strømmen.lat + 0.0005,
      longitude: strømmen.lng + 0.0005,
      pricePerHour: 15,
      description: "Parkeringsplass langs Strømmenveien. Perfekt for besøk i området.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1746",
      zoneName: "Strømmenveien",
    },
    {
      type: "UTENDORS" as const,
      address: "Storgata 20, 2010 Strømmen",
      latitude: strømmen.lat + 0.0003,
      longitude: strømmen.lng - 0.0003,
      pricePerHour: 16,
      description: "Parkeringsplass langs Storgata i Strømmen sentrum.",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      isActive: true,
      supportsAdvanceBooking: true,
      supportsOnDemandBooking: true,
      zoneNumber: "1747",
      zoneName: "Storgata Strømmen",
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

    // Beregn polygon-koordinater hvis vi har koordinater
    let rectData: {
      rectCorner1Lat?: number | null
      rectCorner1Lng?: number | null
      rectCorner2Lat?: number | null
      rectCorner2Lng?: number | null
      rectCorner3Lat?: number | null
      rectCorner3Lng?: number | null
      rectCorner4Lat?: number | null
      rectCorner4Lng?: number | null
      rectNorthLat?: number | null
      rectSouthLat?: number | null
      rectEastLng?: number | null
      rectWestLng?: number | null
      rectWidthMeters?: number | null
      rectHeightMeters?: number | null
    } = {}

    if (spot.latitude !== null && spot.longitude !== null) {
      // Variabel størrelse basert på parkeringsplass-type og indeks
      // Utendørs langs veier: lengre langs veien (20-30 meter), smalere på tvers (4-6 meter)
      // Innendørs i garasjer: standard størrelse (6-10 meter)
      const lengthAlongRoad = spot.type === "UTENDORS" 
        ? 20 + (i % 6) * 2  // 20-30 meter langs veien
        : 8 + (i % 3)       // 8-10 meter for garasjer
      const widthAcrossRoad = spot.type === "UTENDORS"
        ? 4 + (i % 3)       // 4-6 meter på tvers (parkering langs veien)
        : 6 + (i % 2)       // 6-7 meter for garasjer
      
      // Bestem bearing (vinkel) basert på adressen/veien
      // Karl Johans gate går hovedsakelig øst-vest (90 grader)
      // Møllergata går nord-sør (0 grader)
      // Torggata går øst-vest (90 grader)
      // Storgata går diagonal (45 grader)
      // Standard: varier mellom 0, 45, 90, 135 grader for variasjon
      let roadBearing = 90 // Standard: øst-vest
      const addressLower = spot.address.toLowerCase()
      if (addressLower.includes("karl johan") || addressLower.includes("aker brygge") || 
          addressLower.includes("torggata") || addressLower.includes("rådhusgata")) {
        roadBearing = 90 // Øst-vest
      } else if (addressLower.includes("møllergata") || addressLower.includes("grünerløkka") ||
                 addressLower.includes("thorvald meyers")) {
        roadBearing = 0 // Nord-sør
      } else if (addressLower.includes("storgata") || addressLower.includes("bogstadveien")) {
        roadBearing = 45 // Diagonal nord-øst til sør-vest
      } else if (addressLower.includes("frognerveien")) {
        roadBearing = 135 // Diagonal nord-vest til sør-øst
      } else if (addressLower.includes("sognsveien") || addressLower.includes("sognsvann")) {
        roadBearing = 0 // Nord-sør (Sognsveien går hovedsakelig nord-sør)
      } else if (addressLower.includes("lørenskogveien") || addressLower.includes("lørenskog")) {
        roadBearing = 90 // Øst-vest (Lørenskogveien går hovedsakelig øst-vest)
      } else if (addressLower.includes("furusetveien") || addressLower.includes("furuset")) {
        roadBearing = 45 // Diagonal (Furusetveien går diagonal)
      } else if (addressLower.includes("høybråtenveien") || addressLower.includes("høybråten")) {
        roadBearing = 135 // Diagonal (Høybråtenveien går diagonal)
      } else if (addressLower.includes("strømmenveien") || addressLower.includes("strømmen")) {
        roadBearing = 90 // Øst-vest (Strømmenveien går hovedsakelig øst-vest)
      } else {
        // Varier for andre veier
        roadBearing = [0, 45, 90, 135][i % 4]
      }
      
      // For Trondheim-veier, juster bearing
      if (spot.address.includes("Trondheim")) {
        if (spot.address.includes("Munkegata") || spot.address.includes("Kongens gate")) {
          roadBearing = 0 // Nord-sør
        } else if (spot.address.includes("Dronning Blanca") || spot.address.includes("Kjøpmannsgata")) {
          roadBearing = 90 // Øst-vest
        } else {
          roadBearing = [0, 45, 90, 135][i % 4]
        }
      }
      
      const polygonData = calculatePolygonCorners(
        spot.latitude,
        spot.longitude,
        lengthAlongRoad,
        widthAcrossRoad,
        roadBearing,
        spot.type
      )
      rectData = polygonData
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

