# Backward Compatibility Guide - Easypark Modell

## Oversikt

Dette dokumentet beskriver hvordan Easypark-modellen implementeres uten å bryte eksisterende funksjonalitet. Alle eksisterende features skal fortsette å fungere som før.

## Kritiske Prinsipper

1. **Ingen breaking changes** - Eksisterende API-endepunkter fungerer som før
2. **Default values** - Nye felter har fornuftige defaults
3. **Opt-in funksjonalitet** - ON_DEMAND må eksplisitt aktiveres
4. **Separate queries** - Nye queries skiller mellom bookingType
5. **Graceful degradation** - Applikasjonen fungerer selv om nye felter mangler

## Database Schema - Backward Compatibility

### Kritisk: totalPrice og endTime

**Problem:** Eksisterende schema krever at `totalPrice` og `endTime` er required, men ON_DEMAND bookinger har ikke disse ved opprettelse.

**Løsning:** Gjør feltene nullable, men sett defaults for ADVANCE bookinger.

```prisma
model Booking {
  // ... eksisterende felter
  bookingType    BookingType       @default(ADVANCE) // NYTT - default sikrer backward compat
  endTime        DateTime?         // Gjør nullable
  totalPrice     Float?            // Gjør nullable
  // ... nye felter
}
```

**Migrasjonsstrategi:**
```sql
-- Først gjør kolonnene nullable
ALTER TABLE bookings ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN total_price DROP NOT NULL;

-- Sett default for eksisterende bookinger (ADVANCE)
UPDATE bookings 
SET booking_type = 'ADVANCE' 
WHERE booking_type IS NULL;

-- Validering: Alle ADVANCE bookinger må ha endTime og totalPrice
-- Dette håndteres i application logic, ikke database constraints
```

### Application-level Validering

**For ADVANCE bookinger:**
- `endTime` MÅ være satt (valideres i API)
- `totalPrice` MÅ være satt (valideres i API)
- `bookingType` er default "ADVANCE"

**For ON_DEMAND bookinger:**
- `endTime` kan være null (satt ved stopp)
- `totalPrice` kan være null (beregnes ved stopp)
- `bookingType` er "ON_DEMAND"

## API Endepunkter - Backward Compatibility

### 1. Eksisterende Endepunkter MÅ Fungere

#### GET /api/bookings

**Eksisterende oppførsel:**
- Returnerer alle bookinger for brukeren
- Filtrerer på userType (UTLEIER/LEIETAKER)

**Ny oppførsel:**
- Returnerer både ADVANCE og ON_DEMAND bookinger
- Ingen endring i response format
- Frontend håndterer begge typer

**Implementering:**
```typescript
// Ingen endring i query - returnerer alle bookinger
const bookings = await prisma.booking.findMany({
  where: {
    userId: session.user.id,
    // Ingen bookingType filter - returnerer alle
  },
  // ... resten som før
})
```

#### POST /api/bookings/create

**Eksisterende oppførsel:**
- Oppretter ADVANCE booking
- Krever startTime, endTime, totalPrice

**Ny oppførsel:**
- Fortsatt oppretter ADVANCE booking som standard
- Ingen endring i request/response format
- ON_DEMAND bruker eget endepunkt: `/api/bookings/start`

**Implementering:**
```typescript
// Eksisterende kode fungerer som før
const booking = await prisma.booking.create({
  data: {
    // ... eksisterende felter
    bookingType: "ADVANCE", // Default
    endTime: validatedData.endTime, // Required for ADVANCE
    totalPrice: calculatedPrice, // Required for ADVANCE
  },
})
```

#### GET /api/parking-spots/search

**Eksisterende oppførsel:**
- Søker etter tilgjengelige plasser for ADVANCE booking
- Filtrerer på overlappende bookinger med status PENDING, CONFIRMED, ACTIVE

**Ny oppførsel:**
- Fortsatt søker for ADVANCE booking
- Må ekskludere STARTED bookinger fra konfliktsjekk (kun for ADVANCE)
- ON_DEMAND har egen søk: `/api/parking-spots/map`

**Implementering:**
```typescript
// Eksisterende konfliktsjekk - legg til bookingType filter
const conflictingBookings = await prisma.booking.findFirst({
  where: {
    parkingSpotId: validatedData.parkingSpotId,
    bookingType: "ADVANCE", // KUN sjekk ADVANCE bookinger
    status: {
      in: ["PENDING", "CONFIRMED", "ACTIVE"],
    },
    // ... resten som før
  },
})
```

### 2. Nye Endepunkter (Ikke Bryter Eksisterende)

Alle nye endepunkter er separate og påvirker ikke eksisterende:

- `GET /api/parking-spots/map` - NY
- `POST /api/bookings/prepare` - NY
- `POST /api/bookings/start` - NY
- `GET /api/bookings/active` - NY
- `POST /api/bookings/[id]/stop` - NY
- `GET /api/bookings/[id]/summary` - NY

### 3. Oppdaterte Endepunkter (Backward Compatible)

#### GET /api/bookings/[id]

**Eksisterende oppførsel:**
- Returnerer booking detaljer

**Ny oppførsel:**
- Returnerer booking detaljer (samme format)
- Inkluderer nye felter hvis de finnes (graceful degradation)

**Implementering:**
```typescript
const booking = await prisma.booking.findUnique({
  where: { id: params.id },
  include: {
    // ... eksisterende includes
  },
})

// Response inkluderer nye felter, men frontend håndterer manglende felter
return NextResponse.json(booking)
```

## Frontend - Backward Compatibility

### Eksisterende Komponenter

Alle eksisterende komponenter skal fungere uten endringer:

#### BookingsPage

**Eksisterende oppførsel:**
- Viser alle bookinger
- Filtrerer på status

**Ny oppførsel:**
- Viser både ADVANCE og ON_DEMAND bookinger
- Håndterer STARTED status (vis som "Pågår")
- Graceful degradation hvis nye felter mangler

**Implementering:**
```tsx
const getStatusText = (status: string) => {
  switch (status) {
    case "PENDING": return "Venter"
    case "CONFIRMED": return "Bekreftet"
    case "ACTIVE": return "Aktiv"
    case "STARTED": return "Pågår" // NY
    case "COMPLETED": return "Fullført"
    case "CANCELLED": return "Avbestilt"
    default: return status
  }
}

// Håndter manglende endTime for ON_DEMAND
const endTime = booking.endTime 
  ? new Date(booking.endTime)
  : booking.bookingType === "ON_DEMAND" 
    ? null 
    : new Date() // Fallback
```

#### BookingDetailPage

**Eksisterende oppførsel:**
- Viser booking detaljer
- Viser avbestillingsknapp

**Ny oppførsel:**
- Viser booking detaljer (samme layout)
- Håndterer ON_DEMAND bookinger (vis "Stopp" i stedet for "Avbryt")
- Graceful degradation

**Implementering:**
```tsx
// Sjekk bookingType for å vise riktig handling
{booking.bookingType === "ON_DEMAND" && booking.status === "STARTED" ? (
  <button onClick={handleStop}>Stopp parkering</button>
) : (
  canCancel() && (
    <button onClick={handleCancel}>Avbestill booking</button>
  )
)}
```

### Nye Komponenter (Ikke Påvirker Eksisterende)

Alle nye komponenter er separate:
- `ParkingMap` - Ny side
- `ConfirmParking` - Ny side
- `ActiveParking` - Ny side
- `ParkingSummary` - Ny side

## Tilgjengelighetssjekk - Kritisk

### Problem

Eksisterende kode sjekker konflikter basert på:
- Status: PENDING, CONFIRMED, ACTIVE
- Tidsperiode: startTime, endTime

ON_DEMAND bookinger har:
- Status: STARTED
- Ingen endTime (null)

### Løsning

**For ADVANCE søk:**
- Ekskluder STARTED bookinger fra konfliktsjekk
- Kun sjekk ADVANCE bookinger

**For ON_DEMAND søk:**
- Sjekk kun STARTED bookinger
- Ignorer ADVANCE bookinger (de har fast tid)

**Implementering:**

```typescript
// I /api/parking-spots/search (ADVANCE)
const conflictingBookings = await prisma.booking.findFirst({
  where: {
    parkingSpotId: spotId,
    bookingType: "ADVANCE", // KUN ADVANCE
    status: {
      in: ["PENDING", "CONFIRMED", "ACTIVE"], // Ikke STARTED
    },
    // ... tidsperiode sjekk
  },
})

// I /api/parking-spots/map (ON_DEMAND)
const conflictingBookings = await prisma.booking.findFirst({
  where: {
    parkingSpotId: spotId,
    bookingType: "ON_DEMAND", // KUN ON_DEMAND
    status: "STARTED", // KUN STARTED
  },
})
```

## Payment Model - Backward Compatibility

### Eksisterende Payment

**Eksisterende oppførsel:**
- Opprettes ved booking opprettelse (ADVANCE)
- Status: PENDING → COMPLETED

**Ny oppførsel:**
- ADVANCE: Opprettes ved booking (som før)
- ON_DEMAND: Opprettes ved stopp (ny)

**Implementering:**

```typescript
// I /api/bookings/create (ADVANCE) - Ingen endring
// Payment opprettes som før

// I /api/bookings/[id]/stop (ON_DEMAND) - Ny
// Opprett payment etter stopp
```

## Migrasjonsstrategi

### Fase 1: Database (Ikke Breaking)

```sql
-- 1. Legg til nye nullable kolonner
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

-- 2. Sett default for eksisterende
UPDATE bookings SET booking_type = 'ADVANCE' WHERE booking_type IS NULL;

-- 3. Gjør endTime og totalPrice nullable (ETTER at alle har verdi)
-- Dette er safe fordi alle eksisterende bookinger har verdi
ALTER TABLE bookings ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN total_price DROP NOT NULL;

-- 4. Legg til nye kolonner i parking_spots
ALTER TABLE parking_spots ADD COLUMN price_per_minute DECIMAL(10,2);
ALTER TABLE parking_spots ADD COLUMN supports_advance_booking BOOLEAN DEFAULT true;
ALTER TABLE parking_spots ADD COLUMN supports_on_demand_booking BOOLEAN DEFAULT false;
ALTER TABLE parking_spots ADD COLUMN gps_tolerance_meters DECIMAL(5,2) DEFAULT 50;
ALTER TABLE parking_spots ADD COLUMN zone_number VARCHAR(20);
ALTER TABLE parking_spots ADD COLUMN zone_name VARCHAR(100);
ALTER TABLE parking_spots ADD COLUMN operator VARCHAR(200);

-- 5. Beregn price_per_minute
UPDATE parking_spots 
SET price_per_minute = ROUND((price_per_hour / 60)::numeric, 2)
WHERE price_per_minute IS NULL;
```

### Fase 2: Application Logic

1. Oppdater alle queries til å ekskludere STARTED fra ADVANCE-søk
2. Legg til bookingType filter der nødvendig
3. Håndter nullable endTime og totalPrice

### Fase 3: Frontend

1. Oppdater komponenter til å håndtere nye felter
2. Legg til nye sider for ON_DEMAND
3. Graceful degradation for manglende felter

## Testing Checklist

### Eksisterende Funksjonalitet

- [ ] ADVANCE booking opprettelse fungerer
- [ ] ADVANCE booking visning fungerer
- [ ] ADVANCE booking avbestilling fungerer
- [ ] ADVANCE booking betaling fungerer
- [ ] Søk etter parkeringsplasser fungerer
- [ ] Tilgjengelighetssjekk fungerer
- [ ] Revenue-rapportering fungerer
- [ ] E-postnotifikasjoner fungerer

### Nye Funksjonalitet

- [ ] ON_DEMAND booking start fungerer
- [ ] ON_DEMAND booking stopp fungerer
- [ ] ON_DEMAND booking visning fungerer
- [ ] Kartvisning fungerer
- [ ] Realtids timer fungerer
- [ ] Minuttbasert prising fungerer

### Integrasjon

- [ ] Begge typer vises i bookings-liste
- [ ] Ingen konflikter mellom typer
- [ ] Betalingsflyt fungerer for begge
- [ ] E-postnotifikasjoner fungerer for begge

## Rollback Plan

Hvis noe går galt:

1. **Database Rollback:**
   ```sql
   -- Sett alle ON_DEMAND bookinger til CANCELLED
   UPDATE bookings 
   SET status = 'CANCELLED' 
   WHERE booking_type = 'ON_DEMAND';
   
   -- Deaktiver ON_DEMAND for alle plasser
   UPDATE parking_spots 
   SET supports_on_demand_booking = false;
   ```

2. **Application Rollback:**
   - Deploy forrige versjon
   - Nye endepunkter returnerer 404
   - Eksisterende funksjonalitet fungerer

3. **Frontend Rollback:**
   - Skjul nye lenker/knapper
   - Eksisterende sider fungerer

## Best Practices

1. **Alltid sjekk bookingType** før operasjoner
2. **Bruk default values** for nye felter
3. **Valider required fields** per bookingType
4. **Separate queries** for ADVANCE og ON_DEMAND
5. **Graceful degradation** i frontend
6. **Comprehensive testing** før deploy

## Konklusjon

Med disse retningslinjene vil:
- ✅ Eksisterende funksjonalitet fungere som før
- ✅ Nye funksjoner være opt-in
- ✅ Ingen breaking changes
- ✅ Enkel rollback hvis nødvendig
- ✅ Begge modeller fungere side om side

