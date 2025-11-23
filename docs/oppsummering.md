# Parkshare - Applikasjonsoversikt

## Innledning

Parkshare er en fullstendig webapplikasjon for utleie av private parkeringsplasser. Applikasjonen lar både utleiere (UTLEIER) og leietakere (LEIETAKER) administrere parkeringsutleie gjennom en moderne, brukervennlig plattform.

## Teknologistack

### Frontend & Backend
- **Next.js 14** med App Router
- **TypeScript** for type-sikkerhet
- **React 18** for UI-komponenter
- **Tailwind CSS** for styling

### Database & ORM
- **PostgreSQL** som primærdatabase
- **Prisma ORM** for databasehåndtering og type-generering

### Autentisering & Sikkerhet
- **NextAuth.js** for autentisering og sesjonshåndtering
- **bcryptjs** for passordhashing
- **JWT** for sesjonstokens

### State Management & Data Fetching
- **Zustand** for global state management
- **TanStack Query (React Query)** for server state management og caching

### Betalinger
- **Stripe** for betalingshåndtering
- **Stripe Webhooks** for betalingsbekreftelser og refunderinger

### E-post & Notifikasjoner
- **Resend** for e-postlevering
- Automatiske e-postnotifikasjoner for bookinger, avbestillinger og meldinger

### Kart & Geografiske funksjoner
- **Leaflet** / **React-Leaflet** for interaktive kart
- **OpenStreetMap** som kartleverandør
- GPS-koordinater for lokasjonsbasert søk

### Andre biblioteker
- **qrcode** for generering av QR-koder for innendørs parkeringsplasser
- **Zod** for validering av data
- **clsx** og **tailwind-merge** for CSS-klassehåndtering

## Arkitektur

### Mønster
Applikasjonen følger Next.js 14 App Router-mønsteret med:
- **Server Components** som standard
- **Client Components** kun der nødvendig (interaktivitet, hooks)
- **API Routes** for backend-endepunkter
- **Middleware** for beskyttelse av ruter

### Mappestruktur
```
/app                    # Next.js App Router
  /api                  # API-endepunkter
  /auth                 # Autentiseringssider
  /dashboard            # Hovedapplikasjon (beskyttet)
  /terms                # Vilkår og betingelser
/components             # Gjenbrukbare React-komponenter
/lib                    # Utility-funksjoner og konfigurasjon
/prisma                 # Database schema
/scripts                # Hjelpeskript (f.eks. seeding)
/docs                   # Dokumentasjon
```

## Hovedfunksjonalitet

### 1. Brukerhåndtering

#### Autentisering
- Registrering med e-postverifisering
- Innlogging med e-post og passord
- Glemt passord-funksjonalitet
- Passordreset med tokens
- E-postverifisering ved registrering
- To brukertyper: UTLEIER og LEIETAKER

#### Profilhåndtering
- Brukerprofil med navn, e-post, telefon
- Passordendring
- Profiloppdatering

### 2. Parkeringsplasshåndtering (for utleiere)

#### Opprettelse
- Registrering av nye parkeringsplasser
- To typer: UTENDORS (utendørs) og INNENDORS (innendørs/garasje)
- GPS-koordinater for utendørs plasser
- QR-kodegenerering for innendørs plasser
- Bildeopplasting
- Beskrivelse og adresse
- Pris per time med automatisk prisforslag

#### Administrasjon
- Oversikt over alle parkeringsplasser
- Aktivering/deaktivering av plasser
- Redigering av plasser
- Visning av bookinghistorikk per plass

### 3. Søk og Booking (for leietakere)

#### Søkefunksjonalitet
- Lokasjonsbasert søk med GPS
- Filtrering på:
  - Dato og tid (start/slutt)
  - Maks pris per time
  - Type (utendørs/innendørs)
  - Maks avstand (kilometer)
- Kartvisning med markører
- Listevisning av resultater
- Realtids tilgjengelighetssjekk

#### Bookingprosess
- Valg av parkeringsplass
- Valg av dato og tid
- Prisberegning basert på varighet
- Godkjenning av vilkår og betingelser
- Opprettelse av booking (status: PENDING)
- QR-kodegenerering for innendørs plasser
- Automatisk e-postbekreftelse til både leietaker og utleier

### 4. Betalingshåndtering

#### Stripe-integrasjon
- Opprettelse av Payment Intent
- Sikker betalingsbehandling
- Webhook-håndtering for:
  - Betalingsbekreftelse (oppdaterer booking til CONFIRMED)
  - Betalingsfeil
- Automatisk refundering ved avbestilling
- Betalingsstatussporing

#### Betalingsflyt
1. Booking opprettes (PENDING)
2. Leietaker betaler via Stripe
3. Webhook mottas → Booking oppdateres til CONFIRMED
4. Ved avbestilling → Automatisk refundering hvis mer enn 30 min før start

### 5. Bookingadministrasjon

#### Bookingstatus
- **PENDING**: Opprettet, venter på betaling
- **CONFIRMED**: Betalt og bekreftet
- **ACTIVE**: Pågående booking
- **COMPLETED**: Fullført
- **CANCELLED**: Avbestilt

#### Funksjoner
- Oversikt over alle bookinger
- Filtrering (alle, aktive, kommende, tidligere)
- Detaljvisning per booking
- Avbestilling (kun leietakere, minst 30 min før start)
- Automatisk refundering ved avbestilling
- Bookinghistorikk

### 6. Meldingssystem

#### Kommunikasjon
- Direktemeldinger mellom leietaker og utleier
- Meldinger knyttet til spesifikke bookinger
- Realtids oppdatering (polling hvert 5. sekund)
- Lesestatus for meldinger
- E-postnotifikasjoner ved nye meldinger
- Badge for uleste meldinger i navigasjon

### 7. Inntektsoppfølging (for utleiere)

#### Rapportering
- Total inntekt (alle tidspunkter, måned, år)
- Antall bookinger
- Inntekt per parkeringsplass
- Filtrering på tidsperiode
- Detaljert oversikt per plass

### 8. E-postnotifikasjoner

#### Automatiske e-poster
- **Registrering**: Velkomstmelding med verifiseringslink
- **Bookingbekreftelse**: Til både leietaker og utleier
- **Avbestilling**: Bekreftelse med refunderinginfo
- **Nye meldinger**: Notifikasjon om nye meldinger
- **Bookingpåminnelser**: 1 time før booking starter (via cron job)

### 9. QR-kodehåndtering

#### QR-koder
- Automatisk generering for innendørs plasser
- Unike QR-koder per booking
- Visning i bookingdetaljer
- Inkludert i e-postbekreftelser

### 10. Cron Jobs

#### Automatiserte oppgaver
- **Bookingpåminnelser**: Kjøres hvert 10. minutt
  - Sender e-post 1 time før booking starter
  - Beskyttet med CRON_SECRET

## Database Schema

### Modeller

#### User
- Brukerinformasjon
- To typer: UTLEIER, LEIETAKER
- E-postverifisering
- Passordreset-tokens
- Relasjoner: bookings, parkingSpots, messages, termsAcceptances

#### ParkingSpot
- Parkeringsplassinformasjon
- Type: UTENDORS, INNENDORS
- GPS-koordinater (valgfritt for utendørs)
- QR-kode (for innendørs)
- Pris per time
- Status (aktiv/inaktiv)
- Relasjoner: user, bookings

#### Booking
- Bookinginformasjon
- Status: PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED
- Starttid og sluttid
- Totalpris
- QR-kode (for innendørs)
- Relasjoner: parkingSpot, user, messages, termsAcceptance

#### Message
- Meldinger mellom brukere
- Knyttet til booking
- Lesestatus
- Relasjoner: booking, sender, receiver

#### Payment
- Betalingsinformasjon
- Stripe Payment Intent ID
- Status: PENDING, COMPLETED, FAILED, REFUNDED
- Refunderingstidspunkt
- Relasjoner: booking (1:1)

#### TermsAcceptance
- Godkjenning av vilkår
- Knyttet til booking
- Relasjoner: booking, user

## API Endepunkter

### Autentisering
- `POST /api/auth/signup` - Registrering
- `POST /api/auth/forgot-password` - Glemt passord
- `POST /api/auth/reset-password` - Reset passord
- `GET /api/auth/verify-email` - E-postverifisering
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Parkeringsplasser
- `GET /api/parking-spots` - Hent alle plasser for utleier
- `POST /api/parking-spots` - Opprett ny plass
- `GET /api/parking-spots/[id]` - Hent spesifikk plass
- `GET /api/parking-spots/search` - Søk etter plasser (leietakere)
- `POST /api/parking-spots/suggest-price` - Foreslå pris

### Bookinger
- `GET /api/bookings` - Hent alle bookinger
- `POST /api/bookings/create` - Opprett booking
- `GET /api/bookings/[id]` - Hent spesifikk booking
- `POST /api/bookings/[id]/cancel` - Avbestill booking
- `GET /api/bookings/[id]/messages` - Hent meldinger
- `POST /api/bookings/[id]/messages` - Send melding

### Betalinger
- `POST /api/payments/create-intent` - Opprett Payment Intent
- `POST /api/webhooks/stripe` - Stripe webhooks

### Andre
- `GET /api/revenue` - Hent inntekter (utleiere)
- `GET /api/messages/unread` - Hent antall uleste meldinger
- `GET /api/cron/booking-reminders` - Cron job for påminnelser
- `POST /api/upload/image` - Last opp bilde
- `GET /api/user/profile` - Hent brukerprofil
- `POST /api/user/profile` - Oppdater profil
- `POST /api/user/change-password` - Endre passord

## Sikkerhet

### Autentisering
- Alle dashboard-ruter er beskyttet via middleware
- NextAuth JWT-strategi
- Passordhashing med bcrypt (10 rounds)
- E-postverifisering ved registrering

### Autorisasjon
- Rollbasert tilgang (UTLEIER vs LEIETAKER)
- Eierskapssjekk for ressurser
- API-endepunkter validerer brukertype

### Validering
- Zod-schemas for all inputvalidering
- TypeScript for type-sikkerhet
- Server-side validering av alle requests

### Betalingssikkerhet
- Stripe Payment Intents for sikker betaling
- Webhook-signaturverifisering
- Ingen direkte kortinformasjon lagres

## Miljøvariabler

### Påkrevde
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Applikasjons-URL
- `NEXTAUTH_SECRET` - Hemmelig nøkkel for NextAuth

### Valgfrie (men anbefalt)
- `RESEND_API_KEY` - For e-postnotifikasjoner
- `RESEND_FROM_EMAIL` - E-postadresse for sending
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `CRON_SECRET` - Hemmelig nøkkel for cron jobs
- `MAPBOX_ACCESS_TOKEN` - For forbedret kartvisning (ikke implementert ennå)

## Funksjonelle detaljer

### Prisberegning
- Automatisk beregning basert på pris per time × varighet
- Avrunding til 2 desimaler
- Prisforslag basert på type (innendørs = 1.5x basepris)

### Tilgjengelighetssjekk
- Sjekker for overlappende bookinger
- Filtrerer ut bookede plasser i søkeresultater
- Status-basert filtrering (PENDING, CONFIRMED, ACTIVE)

### Avstandsberegning
- Haversine-formel for GPS-avstand
- Filtrering basert på maks avstand i kilometer

### Avbestillingsregler
- Leietakere kan kun avbestille mer enn 30 minutter før start
- Automatisk refundering hvis booking er betalt
- E-postnotifikasjoner til begge parter

### Bookingpåminnelser
- Automatisk cron job hvert 10. minutt
- Sender e-post 1 time før booking starter
- Inkluderer QR-kode og GPS-koordinater

## UI/UX Features

### Design
- Moderne gradient-design (blå til grønn)
- Responsivt design (mobile-first)
- Tailwind CSS for styling
- Smooth transitions og hover-effekter

### Navigasjon
- Brukertype-spesifikk navigasjon
- Badge for uleste meldinger
- Sticky navigation bar
- Breadcrumbs og klar navigasjonsstruktur

### Kart
- Interaktive kart med Leaflet
- Markører for parkeringsplasser
- Brukerlokasjon-visning
- Popup med plassinformasjon
- Automatisk zoom til alle markører

### Feedback
- Loading states
- Error handling med brukervennlige meldinger
- Success-meldinger
- Formvalidering i sanntid

## Testing & Utvikling

### Seeding
- Testdata-script tilgjengelig
- Oppretter test-utleier og 8 parkeringsplasser
- Lokasjoner i Oslo-området

### Utviklingsmiljø
- Hot reload med Next.js
- TypeScript for type-sikkerhet
- ESLint for kodekvalitet
- Development vs Production-miljøer

## Deployment

### Anbefalt plattform
- **Vercel** (optimalt for Next.js)
- Støtte for:
  - Serverless functions
  - Edge functions
  - Cron jobs
  - Environment variables

### Database
- **Supabase** (anbefalt i README)
- Eller hvilken som helst PostgreSQL-instans

### E-post
- **Resend** (konfigurert)
- Alternativer kan enkelt integreres

### Betalinger
- **Stripe** (konfigurert)
- Test- og produksjonsmiljøer

## Fremtidige forbedringer (potensielle)

### Funksjonalitet
- Anmeldelser og vurderinger
- Favoritt-parkeringsplasser
- Rekkerbooking
- Push-notifikasjoner
- Mobilapp (React Native)
- Admin-dashboard
- Rapportering og analytics
- Multi-valuta støtte

### Teknisk
- Real-time meldinger (WebSockets)
- Forbedret kartvisning (Mapbox)
- Bildekomprimering
- Caching-strategier
- Rate limiting
- API-dokumentasjon (Swagger/OpenAPI)

## Konklusjon

Parkshare er en fullstendig, produksjonsklar applikasjon for parkeringsutleie med:
- ✅ Komplett brukerhåndtering
- ✅ Parkeringsplassadministrasjon
- ✅ Avansert søk og booking
- ✅ Sikker betalingshåndtering
- ✅ Meldingssystem
- ✅ E-postnotifikasjoner
- ✅ Inntektsoppfølging
- ✅ Moderne UI/UX
- ✅ Robust sikkerhet
- ✅ Skalerbar arkitektur

Applikasjonen er klar for produksjon med riktig konfigurasjon av miljøvariabler og tjenester.

