# Easypark-modell Implementering - Teknisk Spesifikasjon

## Oversikt

Dette dokumentet beskriver hvordan Parkshare-applikasjonen kan utvides til å støtte Easypark-lignende "start/stop" parkeringsmodell i tillegg til eksisterende forhåndsbooking-modell. Implementeringen er basert på analyser av Easypark-appens brukergrensesnitt og funksjonalitet.

## Forskjeller mellom modeller

### Nåværende modell (Forhåndsbooking)
- ✅ Fast start/slutt-tid ved booking
- ✅ Betaling før parkering starter
- ✅ Fast pris basert på forhåndsvalgt periode
- ✅ QR-kode for innendørs plasser
- ✅ Bookingstatus: PENDING → CONFIRMED → ACTIVE → COMPLETED

### Easypark-modell (Start/Stop)
- 🔄 **Kartbasert valg** av parkeringsområde
- 🔄 **Start parkering** når bruker ankommer (GPS-basert)
- 🔄 **Realtids timer** med gjenværende tid
- 🔄 Parkering pågår til bruker stopper den
- 🔄 **Betaling etter parkering** er stoppet
- 🔄 **Pris basert på faktisk varighet** (minutter)
- 🔄 **Sammendrag** etter stopp med detaljer

## Foreslått løsning: Hybrid-modell

Støtt begge modeller i samme applikasjon ved å legge til en `bookingType` i datamodellen.

**⚠️ VIKTIG: Backward Compatibility**
- Alle eksisterende funksjoner skal fungere som før
- Nye felter er nullable med defaults
- Eksisterende API-endepunkter påvirkes ikke
- Se `backward-compatibility-guide.md` for detaljerte retningslinjer

## 1. Database Schema Endringer

**⚠️ KRITISK:** `endTime` og `totalPrice` må gjøres nullable for ON_DEMAND, men ADVANCE bookinger MÅ ha disse verdiene (valideres i application logic).

### Oppdatering av Booking-modellen

```prisma
model Booking {
  id              String           @id @default(cuid())
  parkingSpotId   String
  userId          String
  bookingType    BookingType       @default(ADVANCE) // NYTT - default sikrer backward compat
  startTime       DateTime         // For ADVANCE: planlagt, for ON_DEMAND: faktisk start
  endTime         DateTime?        // ⚠️ Nullable for ON_DEMAND, men REQUIRED for ADVANCE (valideres i app)
  actualStartTime DateTime?        // NYTT: Faktisk starttid (GPS-verifisert)
  actualEndTime   DateTime?        // NYTT: Faktisk sluttid
  totalPrice      Float?           // ⚠️ Nullable for ON_DEMAND, men REQUIRED for ADVANCE (valideres i app)
  estimatedPrice  Float?          // NYTT: Estimert pris for ON_DEMAND (realtids)
  durationMinutes Int?             // NYTT: Faktisk varighet i minutter
  status          BookingStatus    @default(PENDING)
  qrCode          String?          @unique
  gpsStartLat     Float?           // NYTT: GPS ved start
  gpsStartLng     Float?           // NYTT: GPS ved start
  gpsEndLat       Float?           // NYTT: GPS ved stopp
  gpsEndLng       Float?           // NYTT: GPS ved stopp
  vehiclePlate    String?          // NYTT: Kjøretøyregistreringsnummer
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  cancelledAt     DateTime?
  parkingSpot     ParkingSpot      @relation(fields: [parkingSpotId], references: [id], onDelete: Cascade)
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages        Message[]
  termsAcceptance TermsAcceptance?

  @@index([parkingSpotId])
  @@index([userId])
  @@index([startTime, endTime])
  @@index([status, bookingType]) // NYTT: For effektiv søking
  @@index([userId, status])     // NYTT: For å finne aktiv parkering raskt
  @@map("bookings")
}

// ⚠️ VALIDERING I APPLICATION LOGIC:
// - ADVANCE bookinger MÅ ha endTime og totalPrice
// - ON_DEMAND bookinger kan ha null endTime/totalPrice ved opprettelse

enum BookingType {
  ADVANCE    // Forhåndsbooking (nåværende modell)
  ON_DEMAND  // Start/stop modell (Easypark-lignende)
}

enum BookingStatus {
  PENDING
  CONFIRMED
  ACTIVE
  COMPLETED
  CANCELLED
  STARTED    // NYTT: Parkering startet (ON_DEMAND)
}
```

### Oppdatering av ParkingSpot-modellen

```prisma
model ParkingSpot {
  id           String      @id @default(cuid())
  userId       String
  type         ParkingType
  address      String
  latitude     Float?
  longitude    Float?
  imageUrl     String?
  qrCode       String?     @unique
  pricePerHour Float
  pricePerMinute Float?    // NYTT: For minuttbasert prising (beregnes automatisk)
  description  String?
  isActive     Boolean     @default(true)
  // NYTT: Støtt begge modeller - defaults sikrer backward compat
  supportsAdvanceBooking Boolean @default(true)  // ✅ Alle eksisterende plasser støtter ADVANCE
  supportsOnDemandBooking Boolean @default(false) // ⚠️ Opt-in for ON_DEMAND
  // NYTT: GPS-toleranse for start/stop (meter)
  gpsToleranceMeters      Float?  @default(50)
  // NYTT: Område/zone informasjon (for kartvisning)
  zoneNumber   String?     // F.eks. "1720" som i Easypark
  zoneName     String?    // F.eks. "Strømmen"
  operator     String?    // F.eks. "Lillestrøm parkering AS"
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  bookings     Booking[]
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([latitude, longitude]) // NYTT: For kartbasert søk
  @@map("parking_spots")
}

// ⚠️ BACKWARD COMPATIBILITY:
// - Alle eksisterende plasser har supportsAdvanceBooking = true (default)
// - supportsOnDemandBooking = false (default) - må eksplisitt aktiveres
// - pricePerMinute beregnes automatisk fra pricePerHour

### Ny modell: Vehicle (Kjøretøy)

```prisma
model Vehicle {
  id          String   @id @default(cuid())
  userId      String
  plateNumber String   // F.eks. "EV42193"
  make        String?  // F.eks. "Tesla"
  model       String?  // F.eks. "Model 3"
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookings    Booking[]

  @@index([userId])
  @@map("vehicles")
}

// Oppdater User-modellen
model User {
  // ... eksisterende felter
  vehicles    Vehicle[]
}
```

## 2. Nye API Endepunkter

### 2.1 Hent Parkeringsområder på Kart

```
GET /api/parking-spots/map
```

**Query Parameters:**
- `latitude` (required): Brukerens nåværende breddegrad
- `longitude` (required): Brukerens nåværende lengdegrad
- `radius` (optional): Søkeradius i kilometer (default: 5)

**Response:**
```json
{
  "parkingSpots": [
    {
      "id": "spot-id",
      "zoneNumber": "1720",
      "zoneName": "Strømmen",
      "address": "Strømmen",
      "latitude": 59.9139,
      "longitude": 10.7522,
      "pricePerHour": 30,
      "pricePerMinute": 0.5,
      "operator": "Lillestrøm parkering AS",
      "type": "UTENDORS",
      "isAvailable": true
    }
  ],
  "userLocation": {
    "latitude": 59.9139,
    "longitude": 10.7522
  }
}
```

**Logikk:**
- Hent alle aktive parkeringsplasser innenfor radius
- Filtrer ut bookede plasser (for ON_DEMAND)
- Returner med GPS-koordinater for kartvisning

### 2.2 Velg Parkeringsområde

```
GET /api/parking-spots/[id]
```

**Response:**
```json
{
  "id": "spot-id",
  "zoneNumber": "1720",
  "zoneName": "Strømmen",
  "address": "Strømmen",
  "latitude": 59.9139,
  "longitude": 10.7522,
  "pricePerHour": 30,
  "pricePerMinute": 0.5,
  "operator": "Lillestrøm parkering AS",
  "type": "UTENDORS",
  "gpsToleranceMeters": 50,
  "supportsOnDemandBooking": true
}
```

### 2.3 Forbered Start (Bekreft Parkering)

```
POST /api/bookings/prepare
```

**Request:**
```json
{
  "parkingSpotId": "spot-id",
  "vehiclePlate": "EV42193",
  "latitude": 59.9139,
  "longitude": 10.7522
}
```

**Response:**
```json
{
  "parkingSpot": {
    "id": "spot-id",
    "zoneNumber": "1720",
    "zoneName": "Strømmen",
    "address": "Strømmen",
    "operator": "Lillestrøm parkering AS"
  },
  "vehicle": {
    "plateNumber": "EV42193",
    "make": "Tesla"
  },
  "estimatedDuration": null, // For ON_DEMAND er dette null
  "estimatedPrice": 0, // Starter på 0, beregnes etter stopp
  "canStart": true,
  "gpsVerified": true
}
```

**Logikk:**
- Verifiser GPS-posisjon
- Sjekk at plassen er tilgjengelig
- Valider kjøretøy
- Returner informasjon for bekreftelsesskjerm

### 2.4 Start Parkering (ON_DEMAND)

```
POST /api/bookings/start
```

**Request:**
```json
{
  "parkingSpotId": "spot-id",
  "vehiclePlate": "EV42193",
  "latitude": 59.9139,
  "longitude": 10.7522
}
```

**Response:**
```json
{
  "id": "booking-id",
  "status": "STARTED",
  "actualStartTime": "2024-11-23T12:43:00Z",
  "startTime": "2024-11-23T12:43:00Z",
  "estimatedPrice": 0,
  "parkingSpot": {
    "id": "spot-id",
    "zoneNumber": "1720",
    "zoneName": "Strømmen",
    "pricePerMinute": 0.5
  },
  "vehicle": {
    "plateNumber": "EV42193",
    "make": "Tesla"
  }
}
```

**Logikk:**
1. Verifiser at brukeren er nær parkeringsplassen (GPS-toleranse)
2. Sjekk at plassen er tilgjengelig (ingen aktive bookinger)
3. Sjekk at brukeren ikke har aktiv parkering allerede
4. Opprett booking med status STARTED
5. Lagre GPS-koordinater
6. Lagre kjøretøyinformasjon
7. Sett startTime = actualStartTime = nå
8. Returner booking med estimert pris (0 ved start)

### 2.5 Hent Aktiv Parkering

```
GET /api/bookings/active
```

**Response:**
```json
{
  "id": "booking-id",
  "status": "STARTED",
  "actualStartTime": "2024-11-23T12:43:00Z",
  "durationMinutes": 26,
  "remainingMinutes": 0, // For ON_DEMAND er dette null (ingen maks)
  "estimatedPrice": 13.00,
  "parkingSpot": {
    "id": "spot-id",
    "zoneNumber": "1720",
    "zoneName": "Strømmen",
    "address": "Strømmen",
    "pricePerMinute": 0.5
  },
  "vehicle": {
    "plateNumber": "EV42193",
    "make": "Tesla"
  }
}
```

**Logikk:**
- Hent brukerens aktive ON_DEMAND booking (status = STARTED)
- Beregn nåværende varighet i minutter
- Beregn estimert pris basert på faktisk varighet
- Returner null hvis ingen aktiv parkering

### 2.6 Oppdater Estimert Pris (Realtids)

```
GET /api/bookings/[id]/estimate
```

**Response:**
```json
{
  "durationMinutes": 67,
  "estimatedPrice": 33.50,
  "currentTime": "2024-11-23T13:50:00Z",
  "startTime": "2024-11-23T12:43:00Z"
}
```

**Logikk:**
- Beregn varighet fra startTime til nå
- Beregn pris: `durationMinutes * pricePerMinute`
- Avrund til 2 desimaler

### 2.7 Stopp Parkering (ON_DEMAND)

```
POST /api/bookings/[id]/stop
```

**Request:**
```json
{
  "latitude": 59.9139,  // Optional
  "longitude": 10.7522  // Optional
}
```

**Response:**
```json
{
  "id": "booking-id",
  "status": "COMPLETED",
  "actualStartTime": "2024-11-23T12:43:00Z",
  "actualEndTime": "2024-11-23T12:44:00Z",
  "startTime": "2024-11-23T12:43:00Z",
  "endTime": "2024-11-23T12:44:00Z",
  "durationMinutes": 1,
  "totalPrice": 0.50,
  "parkingSpot": {
    "id": "spot-id",
    "zoneNumber": "1720",
    "zoneName": "Strømmen"
  },
  "vehicle": {
    "plateNumber": "EV42193",
    "make": "Tesla"
  },
  "paymentIntent": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx"
  }
}
```

**Logikk:**
1. Verifiser at booking eksisterer og er STARTED
2. Beregn faktisk varighet i minutter
3. Beregn totalpris: `durationMinutes * pricePerMinute`
4. Oppdater booking:
   - status → COMPLETED
   - actualEndTime = nå
   - endTime = nå
   - durationMinutes = beregnet varighet
   - totalPrice = beregnet pris
5. Opprett Payment Intent for betaling
6. Returner booking med totalpris og payment intent

### 2.8 Hent Sammendrag (Etter Stopp)

```
GET /api/bookings/[id]/summary
```

**Response:**
```json
{
  "id": "booking-id",
  "parkingSpot": {
    "zoneNumber": "1720",
    "zoneName": "Strømmen",
    "operator": "Lillestrøm parkering AS"
  },
  "vehicle": {
    "plateNumber": "EV42193",
    "make": "Tesla"
  },
  "startTime": "2024-11-23T12:43:00Z",
  "endTime": "2024-11-23T12:44:00Z",
  "durationMinutes": 1,
  "durationSeconds": 36,
  "pricing": {
    "parkingPrice": 0.50,
    "serviceFee": 0.00,
    "total": 0.50,
    "vatIncluded": true
  },
  "payment": {
    "status": "COMPLETED",
    "method": "Apple Pay"
  }
}
```

## 3. Frontend Implementering

### 3.1 Kartvisning med Parkeringsområder

**Route:** `/dashboard/parking/map`

**Komponent:** `app/dashboard/parking/map/page.tsx`

**Funksjonalitet:**
- Vis interaktivt kart (Leaflet)
- Vis brukerens nåværende posisjon
- Vis alle tilgjengelige parkeringsområder som markører
- Klikk på markør for å velge område
- Vis bottom sheet med områdedetaljer
- "Velg område" knapp for å gå videre

**UI Elementer:**
- Kart med zoom og pan
- Blå markører med "P" for parkeringsplasser
- Grønn markør for brukerens posisjon
- Bottom sheet med liste over områder
- Søkefunksjon for områder

### 3.2 Bekreft Parkering (Før Start)

**Route:** `/dashboard/parking/confirm`

**Komponent:** `app/dashboard/parking/confirm/page.tsx`

**Funksjonalitet:**
- Vis valgt parkeringsområde (zoneNumber, zoneName, operator)
- Vis kjøretøyinformasjon (plateNumber, make)
- Vis betalingsmetode
- Vis total (0 kr ved start, siden det er ON_DEMAND)
- "Start" knapp for å starte parkering
- Tilbake-knapp for å velge annet område

**UI Layout:**
```
[Bekreft parkering]
Sjekk takstgruppen, parkeringstid og skiltnummeret...

[P 1720 Strømmen] →
[27 min Utløper 13:10] →
[EV42193 Tesla] →
[Apple Pay Privat] →

Total: 0 kr
Inkludert servicetillegg: 0 kr

[Start] (stor lilla knapp)
```

### 3.3 Aktiv Parkering (Pågående)

**Route:** `/dashboard/parking/active`

**Komponent:** `app/dashboard/parking/active/page.tsx`

**Funksjonalitet:**
- Stor sirkulær timer med gjenværende tid (eller varighet)
- Vis "Utløper [tid]" under timeren
- Realtids oppdatering av varighet og estimert pris
- "Stopp" knapp (stor lilla)
- "Endre varighet" knapp (hvit med lilla border) - for fremtidig funksjonalitet
- Vis kjøretøyinfo
- Vis estimert pris (oppdateres kontinuerlig)

**UI Layout:**
```
[i] P 1720 [X]

[Stor sirkel med timer: 26:52]
Utløper 13:10

[Stopp] (lilla)
[Endre varighet] (hvit)

[EV42193 Tesla]
[0 kr Inkludert servicetillegg 0 kr]
[Apple Pay Privat]
```

**Timer Komponent:**
```tsx
interface ParkingTimerProps {
  startTime: Date
  pricePerMinute: number
  onStop: () => void
  onExtend?: () => void
}
```

**Realtids Oppdatering:**
- Poll `/api/bookings/active` hvert 30. sekund
- Oppdater varighet og estimert pris
- Vis timer med countdown/up

### 3.4 Stopp Bekreftelse

**Modal/Dialog:** Komponent i aktiv parkering-side

**Komponent:** `components/StopParkingDialog.tsx`

**Funksjonalitet:**
- Bekreftelsesdialog når bruker klikker "Stopp"
- Vis kjøretøy og område
- "Stopp parkering" knapp (rød)
- "Avbryt" knapp (hvit med lilla border)

**UI:**
```
[Stopp parkering?]

Du vil stoppe parkering for EV42193 i område Strømmen.

[Stopp parkering] (rød)
[Avbryt] (hvit)
```

### 3.5 Sammendrag (Etter Stopp)

**Route:** `/dashboard/parking/summary/[id]`

**Komponent:** `app/dashboard/parking/summary/[id]/page.tsx`

**Funksjonalitet:**
- Vis parkeringsområde (zoneNumber, zoneName, operator)
- Vis starttid og sluttid
- Vis varighet (minutter og sekunder)
- Vis kjøretøy
- Vis prisdetaljer:
  - Parkeringspris
  - Servicetillegg
  - Total inkl. MVA
- "Legg til notat" knapp
- "Send kvittering via e-post" knapp
- Betalingsknapp hvis ikke betalt

**UI Layout:**
```
[Sammendrag] [X]

[1720]
Strømmen
P Gateparkering - Lillestrøm parkering AS

Parkeringsøkt:
Starttid: 23. nov 2025 - 12:43
Sluttid: 23. nov 2025 - 12:44
Varighet: 36s
Kjøretøy: EV42193

Pris (i)
Parkeringspris: 0,00 kr
Servicetillegg: 0,00 kr
Total, inkl. MVA: 0,00 kr

[Legg til notat] →
[Send kvittering via e-post] →
```

## 4. Prisberegning (Minuttbasert)

### Implementering

**Funksjon:** `lib/pricing.ts` (utvidet)

```typescript
/**
 * Beregn pris basert på minutter (ON_DEMAND)
 */
export function calculatePriceByMinutes(
  pricePerMinute: number,
  startTime: Date,
  endTime: Date
): number {
  const durationMs = endTime.getTime() - startTime.getTime()
  const durationMinutes = Math.ceil(durationMs / (1000 * 60)) // Rund opp til nærmeste minutt
  
  // Minimum 1 minutt
  const minutes = Math.max(1, durationMinutes)
  
  return Math.round(pricePerMinute * minutes * 100) / 100 // Avrund til 2 desimaler
}

/**
 * Beregn estimert pris for pågående parkering
 */
export function calculateEstimatedPrice(
  pricePerMinute: number,
  startTime: Date
): number {
  const now = new Date()
  const durationMs = now.getTime() - startTime.getTime()
  const durationMinutes = Math.ceil(durationMs / (1000 * 60))
  
  const minutes = Math.max(1, durationMinutes)
  return Math.round(pricePerMinute * minutes * 100) / 100
}

/**
 * Konverter pris per time til pris per minutt
 */
export function convertHourlyToMinute(pricePerHour: number): number {
  return Math.round((pricePerHour / 60) * 100) / 100
}
```

### Database Default

```prisma
// I ParkingSpot-modellen
pricePerMinute Float? // Beregnes automatisk: pricePerHour / 60
```

**Migration:**
```sql
UPDATE parking_spots 
SET price_per_minute = ROUND((price_per_hour / 60)::numeric, 2)
WHERE price_per_minute IS NULL;
```

## 5. GPS Verifisering

### Implementering

**Funksjon:** `lib/gps.ts`

```typescript
export interface GPSLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

/**
 * Beregn avstand mellom to GPS-koordinater (Haversine)
 * Returnerer avstand i kilometer
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Sjekk om bruker er innenfor toleranse
 */
export function isWithinTolerance(
  userLocation: GPSLocation,
  targetLocation: GPSLocation,
  toleranceMeters: number = 50
): boolean {
  const distanceKm = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  )
  const distanceMeters = distanceKm * 1000
  return distanceMeters <= toleranceMeters
}
```

### Bruk i API

```typescript
// I /api/bookings/start
const parkingSpot = await prisma.parkingSpot.findUnique({...})
const userLocation = { latitude, longitude }

if (!isWithinTolerance(
  userLocation,
  { latitude: parkingSpot.latitude!, longitude: parkingSpot.longitude! },
  parkingSpot.gpsToleranceMeters || 50
)) {
  return NextResponse.json(
    { error: "Du er ikke nær nok parkeringsplassen" },
    { status: 400 }
  )
}
```

## 6. Realtids Oppdatering

### Polling-strategi

For aktiv parkering, poll API hvert 30. sekund for å oppdatere:
- Varighet
- Estimert pris
- Status

**Implementering:**

```tsx
// I ParkingTimer komponent
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/bookings/active`)
    if (response.ok) {
      const data = await response.json()
      setBooking(data)
      setDuration(data.durationMinutes)
      setEstimatedPrice(data.estimatedPrice)
    }
  }, 30000) // 30 sekunder

  return () => clearInterval(interval)
}, [])
```

### Alternativ: WebSockets (Fremtidig)

For bedre ytelse kan WebSockets implementeres:
- Server-Sent Events (SSE)
- WebSocket connection
- Pusher/Ably for managed solution

## 7. UI/UX Endringer

### Hovednavigasjon

**For leietakere:**
- "Start parkering" (ny) - viser kart
- "Aktiv parkering" (ny, vises kun hvis aktiv)
- "Mine bookinger" (eksisterende)
- "Søk parkering" (eksisterende - forhåndsbooking)

### Mobile-first Design

- Store, enkle knapper for start/stop
- Større touch-targets (min 44x44px)
- Klar visuell feedback
- Push-notifikasjoner (fremtidig)
- Bottom sheets for mobile-optimalisert UI

### Fargepalett (Easypark-inspirert)

- **Primær:** Lilla/purple (#8B5CF6 eller lignende)
- **Sekundær:** Blå for parkeringsikoner
- **Suksess:** Grønn
- **Feil:** Rød
- **Bakgrunn:** Hvit/lys grå

### Notifikasjoner

- Varsel når parkering starter
- Varsel når parkering stoppes
- Påminnelse hvis parkering pågår lenge (f.eks. > 4 timer)
- Push-notifikasjoner (fremtidig)

## 8. Migrasjonsstrategi

### ⚠️ KRITISK: Backward Compatibility i Migrasjon

**Prinsipp:** Alle endringer skal være non-breaking. Eksisterende data og funksjonalitet skal fungere som før.

### Database Migrasjon (Sikker Rekkefølge)

```sql
-- FASE 1: Legg til nye nullable kolonner (ikke breaking)
ALTER TABLE bookings ADD COLUMN booking_type VARCHAR(20) DEFAULT 'ADVANCE';
ALTER TABLE bookings ADD COLUMN actual_start_time TIMESTAMP;
ALTER TABLE bookings ADD COLUMN actual_end_time TIMESTAMP;
ALTER TABLE bookings ADD COLUMN estimated_price DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN duration_minutes INTEGER;
ALTER TABLE bookings ADD COLUMN gps_start_lat DECIMAL(10,8);
ALTER TABLE bookings ADD COLUMN gps_start_lng DECIMAL(11,8);
ALTER TABLE bookings ADD COLUMN gps_end_lat DECIMAL(10,8);
ALTER TABLE bookings ADD COLUMN gps_end_lng DECIMAL(11,8);
ALTER TABLE bookings ADD COLUMN vehicle_plate VARCHAR(20);

-- Sett default for eksisterende bookinger
UPDATE bookings SET booking_type = 'ADVANCE' WHERE booking_type IS NULL;

-- FASE 2: Gjør endTime og totalPrice nullable (ETTER at alle har verdi)
-- Dette er safe fordi alle eksisterende bookinger har verdi
ALTER TABLE bookings ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN total_price DROP NOT NULL;

-- FASE 3: Legg til nye kolonner i parking_spots (med defaults)
ALTER TABLE parking_spots ADD COLUMN price_per_minute DECIMAL(10,2);
ALTER TABLE parking_spots ADD COLUMN supports_advance_booking BOOLEAN DEFAULT true;
ALTER TABLE parking_spots ADD COLUMN supports_on_demand_booking BOOLEAN DEFAULT false;
ALTER TABLE parking_spots ADD COLUMN gps_tolerance_meters DECIMAL(5,2) DEFAULT 50;
ALTER TABLE parking_spots ADD COLUMN zone_number VARCHAR(20);
ALTER TABLE parking_spots ADD COLUMN zone_name VARCHAR(100);
ALTER TABLE parking_spots ADD COLUMN operator VARCHAR(200);

-- Beregn price_per_minute fra price_per_hour (for alle eksisterende)
UPDATE parking_spots 
SET price_per_minute = ROUND((price_per_hour / 60)::numeric, 2)
WHERE price_per_minute IS NULL;

-- FASE 4: Opprett vehicles tabell (ny, ikke breaking)
CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate_number VARCHAR(20) NOT NULL,
  make VARCHAR(50),
  model VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);

-- FASE 5: Legg til nye indexer (ikke breaking)
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX idx_bookings_status_type ON bookings(status, booking_type);
CREATE INDEX idx_parking_spots_location ON parking_spots(latitude, longitude);
```

### ⚠️ VALIDERING: Application Logic

Etter migrasjon må application logic validere:

```typescript
// For ADVANCE bookinger
if (bookingType === "ADVANCE") {
  if (!endTime || !totalPrice) {
    throw new Error("ADVANCE booking må ha endTime og totalPrice")
  }
}

// For ON_DEMAND bookinger
if (bookingType === "ON_DEMAND") {
  // endTime og totalPrice kan være null ved opprettelse
  // Men må settes ved stopp
}
```

### Backward Compatibility

**⚠️ KRITISK:** Se `backward-compatibility-guide.md` for detaljerte retningslinjer.

**Hovedprinsipper:**
- ✅ Eksisterende bookinger fungerer som før (alle er ADVANCE)
- ✅ Eksisterende API-endepunkter påvirkes ikke
- ✅ Nye API-endepunkter er separate
- ✅ Eksisterende UI endres minimalt (kun graceful degradation)
- ✅ Opt-in funksjonalitet (ON_DEMAND må aktiveres per plass)
- ✅ Default values sikrer at eksisterende data fungerer

**Viktige endringer:**
- `endTime` og `totalPrice` er nullable, men REQUIRED for ADVANCE (valideres i app)
- Alle eksisterende queries må ekskludere STARTED status (kun for ADVANCE)
- Nye queries må filtrere på `bookingType`

## 9. Implementeringsrekkefølge

### Fase 1: Database & Backend (1-2 uker)
1. ✅ Oppdater Prisma schema
2. ✅ Kjør migrasjon
3. ✅ Implementer GPS-verifisering
4. ✅ Implementer minuttbasert prising
5. ✅ Implementer `/api/parking-spots/map`
6. ✅ Implementer `/api/bookings/prepare`
7. ✅ Implementer `/api/bookings/start`
8. ✅ Implementer `/api/bookings/active`
9. ✅ Implementer `/api/bookings/[id]/estimate`
10. ✅ Implementer `/api/bookings/[id]/stop`
11. ✅ Implementer `/api/bookings/[id]/summary`
12. ✅ Oppdater betalingsflyt

### Fase 2: Frontend (1-2 uker)
1. ✅ Opprett kart-side (`/dashboard/parking/map`)
2. ✅ Opprett bekreft-siden (`/dashboard/parking/confirm`)
3. ✅ Opprett aktiv-parkering side (`/dashboard/parking/active`)
4. ✅ Opprett sammendrag-side (`/dashboard/parking/summary/[id]`)
5. ✅ Opprett ParkingTimer komponent
6. ✅ Opprett StopParkingDialog komponent
7. ✅ Oppdater dashboard med "Start parkering" knapp
8. ✅ Oppdater navigasjon
9. ✅ Implementer realtids oppdatering

### Fase 3: Testing & Polish (1 uke)
1. ✅ Test GPS-verifisering
2. ✅ Test minuttbasert prising
3. ✅ Test betalingsflyt
4. ✅ Test edge cases (kort parkering, lang parkering)
5. ✅ Optimaliser ytelse
6. ✅ Mobile testing
7. ✅ UI/UX forbedringer

## 10. Eksempel Implementering

### Start Parkering API

```typescript
// app/api/bookings/start/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isWithinTolerance } from "@/lib/gps"
import { z } from "zod"

export const dynamic = "force-dynamic"

const startBookingSchema = z.object({
  parkingSpotId: z.string(),
  vehiclePlate: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userType !== "LEIETAKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = startBookingSchema.parse(body)

    // Hent parkeringsplass
    const parkingSpot = await prisma.parkingSpot.findUnique({
      where: { id: validatedData.parkingSpotId },
    })

    if (!parkingSpot) {
      return NextResponse.json(
        { error: "Parkeringsplass ikke funnet" },
        { status: 404 }
      )
    }

    if (!parkingSpot.supportsOnDemandBooking) {
      return NextResponse.json(
        { error: "Denne plassen støtter ikke start/stop parkering" },
        { status: 400 }
      )
    }

    // Verifiser GPS
    if (parkingSpot.latitude && parkingSpot.longitude) {
      if (!isWithinTolerance(
        { latitude: validatedData.latitude, longitude: validatedData.longitude },
        { latitude: parkingSpot.latitude, longitude: parkingSpot.longitude },
        parkingSpot.gpsToleranceMeters || 50
      )) {
        return NextResponse.json(
          { error: "Du er ikke nær nok parkeringsplassen" },
          { status: 400 }
        )
      }
    }

    // Sjekk at ingen aktiv parkering
    const activeBooking = await prisma.booking.findFirst({
      where: {
        userId: session.user.id,
        status: "STARTED",
        bookingType: "ON_DEMAND",
      },
    })

    if (activeBooking) {
      return NextResponse.json(
        { error: "Du har allerede en aktiv parkering" },
        { status: 400 }
      )
    }

    // Sjekk at plassen er tilgjengelig
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        parkingSpotId: validatedData.parkingSpotId,
        status: "STARTED",
        bookingType: "ON_DEMAND",
      },
    })

    if (conflictingBooking) {
      return NextResponse.json(
        { error: "Parkeringsplassen er allerede i bruk" },
        { status: 400 }
      )
    }

    // Opprett booking
    const now = new Date()
    const booking = await prisma.booking.create({
      data: {
        parkingSpotId: validatedData.parkingSpotId,
        userId: session.user.id,
        bookingType: "ON_DEMAND",
        status: "STARTED",
        startTime: now,
        actualStartTime: now,
        vehiclePlate: validatedData.vehiclePlate,
        gpsStartLat: validatedData.latitude,
        gpsStartLng: validatedData.longitude,
        estimatedPrice: 0,
      },
      include: {
        parkingSpot: {
          select: {
            id: true,
            zoneNumber: true,
            zoneName: true,
            address: true,
            pricePerMinute: true,
          },
        },
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error starting parking:", error)
    return NextResponse.json(
      { error: "Kunne ikke starte parkering" },
      { status: 500 }
    )
  }
}
```

### Stopp Parkering API

```typescript
// app/api/bookings/[id]/stop/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePriceByMinutes } from "@/lib/pricing"
import { stripe, convertNokToOre } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        parkingSpot: {
          select: {
            id: true,
            pricePerMinute: true,
            pricePerHour: true,
            zoneNumber: true,
            zoneName: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: "Booking ikke funnet" },
        { status: 404 }
      )
    }

    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til denne bookingen" },
        { status: 403 }
      )
    }

    if (booking.status !== "STARTED" || booking.bookingType !== "ON_DEMAND") {
      return NextResponse.json(
        { error: "Kan kun stoppe pågående ON_DEMAND parkering" },
        { status: 400 }
      )
    }

    // Beregn varighet og pris
    const now = new Date()
    const startTime = booking.actualStartTime || booking.startTime
    
    // Beregn pricePerMinute hvis ikke satt
    const pricePerMinute = booking.parkingSpot.pricePerMinute || 
      (booking.parkingSpot.pricePerHour / 60)
    
    const totalPrice = calculatePriceByMinutes(pricePerMinute, startTime, now)

    // Oppdater booking
    const durationMs = now.getTime() - startTime.getTime()
    const durationMinutes = Math.ceil(durationMs / (1000 * 60))

    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        endTime: now,
        actualEndTime: now,
        durationMinutes,
        totalPrice,
      },
    })

    // Opprett Payment Intent
    let paymentIntent = null
    if (stripe && totalPrice > 0) {
      const amountInOre = convertNokToOre(totalPrice)
      
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInOre,
        currency: "nok",
        metadata: {
          bookingId: params.id,
          userId: session.user.id,
          bookingType: "ON_DEMAND",
        },
        description: `Parkering: ${booking.parkingSpot.zoneName || booking.parkingSpot.zoneNumber}`,
      })

      await prisma.payment.create({
        data: {
          bookingId: params.id,
          amount: totalPrice,
          currency: "NOK",
          stripePaymentId: paymentIntent.id,
          status: "PENDING",
          paymentType: "ON_DEMAND",
        },
      })
    }

    return NextResponse.json({
      ...updatedBooking,
      paymentIntent: paymentIntent ? {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      } : null,
    })
  } catch (error) {
    console.error("Error stopping parking:", error)
    return NextResponse.json(
      { error: "Kunne ikke stoppe parkering" },
      { status: 500 }
    )
  }
}
```

## 11. Sikkerhetshensyn

### GPS Verifisering
- Toleranse for GPS-nøyaktighet (standard 50 meter)
- Server-side validering (ikke bare client)
- Rate limiting på start/stop (f.eks. maks 10 per time)
- Logging av alle GPS-posisjoner

### Betalingssikkerhet
- Ingen betaling før faktisk stopp
- Maksimal parkeringstid (f.eks. 24 timer) - automatisk stopp
- Minimum parkeringstid (f.eks. 1 minutt)
- Refundering ved feil

### Brukerautentisering
- Må være innlogget for start/stop
- Session-validering
- Rate limiting per bruker

## 12. Ytelse & Skalering

### Optimaliseringer
- Index på (userId, status) for rask søk av aktiv parkering
- Cache aktiv parkering i session (valgfritt)
- Minimal polling-frekvens (30 sekunder)
- Efficient GPS-beregninger (Haversine er O(1))

### Monitoring
- Track antall aktive parkeringer
- Monitor GPS-verifisering suksessrate
- Track gjennomsnittlig parkeringstid
- Alert ved unormale mønstre
- Monitor prisberegninger

## 13. Konklusjon

Dette designet lar Parkshare støtte både:
- ✅ **Forhåndsbooking** (nåværende modell)
- ✅ **Start/Stop parkering** (Easypark-modell)

Begge modeller kan eksistere side om side, og utleiere kan velge hvilken modell de vil støtte per parkeringsplass.

### Fordeler
- Fleksibilitet for utleiere
- Bedre brukeropplevelse for leietakere
- Støtter ulike bruksscenarier
- Backward compatible
- Minuttbasert prising gir rettferdig prising

### Neste steg
1. Review og godkjenn design
2. Implementer Fase 1 (Backend)
3. Implementer Fase 2 (Frontend)
4. Test og iterasjon
5. Rollout til produksjon
