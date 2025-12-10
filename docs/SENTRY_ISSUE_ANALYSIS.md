# Sentry Issue Analysis Guide

Denne guiden hjelper deg med å analysere og fikse feil som vises i Sentry.

## Hvordan analysere en Sentry Issue

### 1. Åpne Issue i Sentry Dashboard

1. Gå til Sentry Dashboard: https://sentry.io
2. Klikk på issue-en du vil analysere
3. Se på følgende informasjon:

### 2. Viktig informasjon i en Issue

#### A. Feilmelding (Error Message)
- **Hva det er:** Hovedfeilmeldingen
- **Hvor:** Øverst i issue-en
- **Eksempel:** `TypeError: Cannot read property 'x' of undefined`

#### B. Stack Trace
- **Hva det er:** Hvor i koden feilen oppstod
- **Hvor:** Under "Stack Trace" eller "Exception"
- **Viktig:** Se på første linje i stack trace - det er der feilen faktisk skjedde

#### C. Breadcrumbs
- **Hva det er:** Hva som skjedde før feilen
- **Hvor:** Under "Breadcrumbs"
- **Viktig:** Hjelper deg å forstå hva brukeren gjorde før feilen

#### D. User Context
- **Hva det er:** Hvilken bruker som opplevde feilen
- **Hvor:** Under "User" eller "Context"
- **Viktig:** Hjelper med å reprodusere feilen

#### E. Request Data
- **Hva det er:** HTTP request detaljer
- **Hvor:** Under "Request"
- **Viktig:** URL, headers, query params, body

### 3. Vanlige Feiltyper og Løsninger

#### TypeError: Cannot read property 'x' of undefined
**Årsak:** Prøver å aksessere en property på undefined/null

**Løsning:**
```typescript
// Før (feil)
const value = obj.property.x

// Etter (riktig)
const value = obj?.property?.x
// eller
if (obj?.property) {
  const value = obj.property.x
}
```

#### Module not found: Can't resolve './module'
**Årsak:** Feil import path eller manglende fil

**Løsning:**
- Sjekk at filen eksisterer
- Sjekk at import path er riktig
- Bruk `@/` alias for absolute paths

#### Network Error / Failed to fetch
**Årsak:** API call feilet

**Løsning:**
- Sjekk at API-endepunktet eksisterer
- Sjekk at serveren kjører
- Sjekk CORS-innstillinger
- Legg til error handling

#### Prisma Error
**Årsak:** Database query feilet

**Løsning:**
- Sjekk at database er tilkoblet
- Sjekk at data er riktig formatert
- Legg til validering før database queries

### 4. Hvordan fikse en Issue

#### Steg 1: Identifiser feilen
- Les feilmeldingen nøye
- Se på stack trace for å finne hvor feilen oppstod
- Sjekk breadcrumbs for å forstå konteksten

#### Steg 2: Reproduser feilen
- Bruk User Context for å se hvilken bruker som opplevde feilen
- Prøv å gjøre samme handling som brukeren gjorde
- Sjekk Request Data for å se hvilken URL/endpoint som ble kalt

#### Steg 3: Fiks feilen
- Gå til filen og linjen som er nevnt i stack trace
- Legg til error handling eller fiks logikken
- Test at fiksen fungerer

#### Steg 4: Deploy og verifiser
- Deploy fiksen til produksjon
- Overvåk Sentry for å se om feilen er fikset
- Marker issue som "Resolved" i Sentry hvis feilen er fikset

### 5. Best Practices

#### Legg til Error Handling
```typescript
try {
  // Risky code
} catch (error) {
  logger.error("Error description", error, { context: "value" })
  // Handle error gracefully
}
```

#### Valider Input
```typescript
// Før API call
if (!data || !data.property) {
  return NextResponse.json({ error: "Invalid data" }, { status: 400 })
}
```

#### Bruk Optional Chaining
```typescript
// I stedet for
const value = obj.property.x

// Bruk
const value = obj?.property?.x
```

### 6. Sentry Issue Actions

#### Resolve Issue
- Når feilen er fikset, marker issue som "Resolved"
- Dette hjelper med å tracke hvilke feil som er fikset

#### Ignore Issue
- Hvis feilen ikke er kritisk eller er en false positive
- Vær forsiktig med å ignorere issues

#### Assign Issue
- Tildel issue til en utvikler
- Hjelper med å organisere arbeidet

### 7. Eksempel: Analysere en Issue

**Feilmelding:**
```
TypeError: Cannot read property 'address' of undefined
```

**Stack Trace:**
```
at ParkingSpotCard (components/ParkingSpotCard.tsx:45:23)
at render (app/dashboard/parking-spots/page.tsx:120:15)
```

**Breadcrumbs:**
1. User navigated to /dashboard/parking-spots
2. API call to /api/parking-spots
3. Received response with 200 status
4. Error occurred while rendering

**Løsning:**
```typescript
// Før (feil)
<div>{parkingSpot.address}</div>

// Etter (riktig)
{parkingSpot?.address && <div>{parkingSpot.address}</div>}
// eller
<div>{parkingSpot?.address || "Ingen adresse"}</div>
```

## Hjelp

Hvis du trenger hjelp med en spesifikk issue:
1. Kopier feilmeldingen
2. Kopier stack trace
3. Legg ved breadcrumbs hvis relevant
4. Beskriv hva du prøver å gjøre når feilen oppstår

