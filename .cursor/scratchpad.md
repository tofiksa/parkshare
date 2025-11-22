# Parkshare - Planleggingsdokument

## Background and Motivation

Parkshare er en webapplikasjon som skal muliggjøre utleie av private parkeringsplasser mellom to typer sluttbrukere:
- **Utleier**: Eiere av private parkeringsplasser som ønsker å leie ut plassene sine
- **Leietaker**: Personer som trenger parkeringsplass og ønsker å leie fra private utleiere

**Hovedmål**: Skape en enkel, forståelig og brukervennlig plattform som gjør det lett å finne, booke og administrere parkeringsutleie.

### Avklarte Produktkrav

1. **Booking**: Fleksible tidsperioder (ikke faste månedlige avtaler)
2. **Geografisk omfang**: Lokal (fokuserer på en bestemt region/by)
3. **Betaling**: Automatisk via appen (integrert betalingsløsning)
4. **Verifisering**: Både leietakere og utleiere verifiserer seg via registrering i appen
5. **Kommunikasjon**: Innebygd meldingssystem mellom utleier og leietaker
6. **Tilgang**: 
   - Utendørs parkeringsplasser: GPS-lokasjon + bilde
   - Garasje/innendørs: QR-kode for tilgang
7. **Pris**: Utleiere følger prisforslag fra plattformen (ikke fritt prissetting)
8. **Avbestilling**: Mulig å avbestille innen 30 minutter før oppstart av leieforholdet
9. **Plattform**: Webapplikasjon (responsiv design for mobil og desktop)
10. **Juridisk**: Avtalevilkår mellom utleier og leietaker må være tilgjengelig og godkjennes

---

## Key Challenges and Analysis

### Tekniske Utfordringer
1. **Geolokasjon og kartvisning**: Må håndtere GPS-koordinater og vise parkeringsplasser på kart
2. **QR-kode generering og validering**: For garasje/innendørs plasser må QR-koder genereres og valideres ved ankomst
3. **Betalingsintegrasjon**: Trenger sikker betalingsløsning (f.eks. Stripe, Vipps API)
4. **Tidsbasert tilgjengelighet**: Må håndtere fleksible tidsperioder og overlappende bookinger
5. **Realtidsvarsler**: Push-varsler eller e-post for bookingbekreftelser, avbestillinger, etc.

### UX-utfordringer
1. **Enkel registrering**: Verifiseringsprosess må være rask og intuitiv
2. **Søk og filtrering**: Brukere må enkelt finne relevante parkeringsplasser basert på lokasjon, tid og pris
3. **Tydelig bookingprosess**: Steg-for-steg guide for booking
4. **Avbestillingsprosess**: Tydelig informasjon om avbestillingsregler (30 min før)
5. **Meldingssystem**: Enkel kommunikasjon mellom utleier og leietaker
6. **Tilgangsinformasjon**: Tydelig visning av hvordan man får tilgang (GPS/bilde vs QR-kode)

### Forretningsutfordringer
1. **Prisalgoritme**: Trenger logikk for å foreslå passende priser basert på lokasjon, tid, etc.
2. **Avtalevilkår**: Juridisk korrekt avtale som begge parter må godkjenne
3. **Trust og sikkerhet**: Verifisering av brukere og håndtering av konflikter

---

## High-level Task Breakdown

### Fase 1: Grunnleggende Infrastruktur og Autentisering
1. **Prosjektoppsett**
   - [ ] Opprett webapplikasjon (React/Next.js eller lignende)
   - [ ] Konfigurer routing og grunnleggende layout
   - [ ] Sett opp state management (Redux/Context/Zustand)
   - [ ] Konfigurer build og deployment pipeline

2. **Autentisering og Brukerregistrering**
   - [ ] Implementer registreringsskjema (utleier/leietaker)
   - [ ] Implementer innloggingsskjema
   - [ ] Implementer passordreset-funksjonalitet
   - [ ] Lag brukerprofil-side med redigeringsmulighet
   - [ ] Implementer session management og logout

### Fase 2: Utleier-funksjonalitet
3. **Parkeringsopprettelse**
   - [ ] Lag skjema for å legge til parkeringsplass
   - [ ] Implementer valg mellom utendørs/innendørs
   - [ ] For utendørs: GPS-lokasjon capture og bildeopplasting
   - [ ] For innendørs: QR-kode generering og bildeopplasting
   - [ ] Implementer adressevalidering og kartvisning
   - [ ] Lag visning av prisforslag fra plattformen
   - [ ] Lagre parkeringsplass i database

4. **Utleier-dashboard**
   - [ ] Oversikt over alle parkeringsplasser
   - [ ] Redigering av eksisterende parkeringsplasser
   - [ ] Sletting av parkeringsplasser
   - [ ] Visning av aktive og kommende bookinger
   - [ ] Oversikt over inntekter/transaksjoner

### Fase 3: Leietaker-funksjonalitet
5. **Søk og Filtrering**
   - [ ] Implementer kartvisning med alle tilgjengelige parkeringsplasser
   - [ ] Søkefunksjonalitet (adresse/lokasjon)
   - [ ] Filtrering basert på:
     - Dato og tid
     - Pris
     - Type (utendørs/innendørs)
     - Avstand
   - [ ] Visning av parkeringsplass-detaljer (bilde, pris, lokasjon, tilgjengelighet)

6. **Bookingprosess**
   - [ ] Velg dato og tid for booking
   - [ ] Vis totalpris basert på valgt periode
   - [ ] Vis avtalevilkår og kreve godkjenning
   - [ ] Integrer betalingsløsning
   - [ ] Bekreftelsesside etter vellykket booking
   - [ ] Generer QR-kode for innendørs plasser (hvis aktuelt)

7. **Leietaker-dashboard**
   - [ ] Oversikt over aktive bookinger
   - [ ] Historikk over tidligere bookinger
   - [ ] Avbestillingsfunksjonalitet (kun innen 30 min før oppstart)
   - [ ] Tilgangsinformasjon (GPS-koordinater, bilde, eller QR-kode)

### Fase 4: Kommunikasjon og Notifikasjoner
8. **Meldingssystem**
   - [ ] Implementer chat-funksjonalitet mellom utleier og leietaker
   - [ ] Vis meldinger knyttet til spesifikke bookinger
   - [ ] Realtidsvarsler for nye meldinger
   - [ ] Meldingshistorikk

9. **Notifikasjoner**
   - [ ] E-postvarsler for:
     - Bookingbekreftelse
     - Avbestilling
     - Nye meldinger
     - Påminnelser før booking starter
   - [ ] Push-varsler (hvis mulig i webapp)

### Fase 5: Betaling og Transaksjoner
10. **Betalingsintegrasjon**
    - [ ] Integrer betalingsløsning (Stripe/Vipps/annet)
    - [ ] Håndter betalingsbekreftelse
    - [ ] Implementer refundering ved avbestilling
    - [ ] Transaksjonshistorikk for begge brukertyper

### Fase 6: Avtalevilkår og Juridisk
11. **Avtalevilkår**
    - [ ] Lag juridisk korrekt avtalevilkår-dokument
    - [ ] Implementer visning av avtalevilkår ved booking
    - [ ] Kreve eksplisitt godkjenning fra begge parter
    - [ ] Lagre godkjenninger i database

### Fase 7: Testing og Forbedringer
12. **Testing**
    - [ ] Unit tests for kritiske funksjoner
    - [ ] Integration tests for bookingflyt
    - [ ] End-to-end tests for brukerreiser
    - [ ] Brukertesting med ekte brukere

13. **UX-forbedringer**
    - [ ] Responsivt design for mobil og desktop
    - [ ] Tilgjengelighet (WCAG-guidelines)
    - [ ] Ytelsesoptimalisering
    - [ ] Feilhåndtering og brukervennlige feilmeldinger

---

## Brukerreiser (User Journeys)

### Utleier - Første gang
1. **Registrering**
   - Besøker parkshare.no
   - Klikker "Bli utleier" eller "Registrer deg"
   - Fyller ut skjema: E-post, passord, navn, telefonnummer
   - Velger "Utleier" som brukertype
   - Mottar bekreftelsesmail og verifiserer konto

2. **Legge til første parkeringsplass**
   - Logger inn og kommer til dashboard
   - Klikker "Legg til parkeringsplass"
   - Velger type: Utendørs eller Innendørs/Garasje
   - **Utendørs**: 
     - Angir adresse eller bruker GPS for å finne lokasjon
     - Ser kart med markert posisjon
     - Laster opp bilde av parkeringsplassen
     - Ser prisforslag fra plattformen
     - Bekrefter og lagrer
   - **Innendørs**:
     - Angir adresse
     - Laster opp bilde av garasje/inngang
     - Systemet genererer QR-kode automatisk
     - Ser prisforslag fra plattformen
     - Bekrefter og lagrer

3. **Motta første booking**
   - Får e-postvarsel om ny booking
   - Logger inn og ser booking i dashboard
   - Kan se leietakers kontaktinfo
   - Kan sende melding til leietaker

### Leietaker - Første booking
1. **Registrering**
   - Besøker parkshare.no
   - Klikker "Finn parkering" eller "Registrer deg"
   - Fyller ut skjema: E-post, passord, navn, telefonnummer
   - Velger "Leietaker" som brukertype
   - Mottar bekreftelsesmail og verifiserer konto

2. **Søke etter parkering**
   - Logger inn og kommer til hjemmeside med kart
   - Angir ønsket lokasjon (adresse eller bruker GPS)
   - Velger dato og tid (start og slutt)
   - Ser alle tilgjengelige parkeringsplasser på kartet
   - Filtrerer eventuelt på pris, type, avstand
   - Klikker på en parkeringsplass for å se detaljer

3. **Booke parkering**
   - Ser detaljert informasjon: Bilde, pris, lokasjon, tilgjengelighet
   - Bekrefter dato og tid
   - Ser totalpris for valgt periode
   - Leser avtalevilkår og godkjenner
   - Fyller ut betalingsinformasjon
   - Bekrefter booking
   - Mottar bekreftelsesmail med tilgangsinformasjon

4. **Før ankomst**
   - Får påminnelse 1 time før booking starter
   - Logger inn og ser aktiv booking i dashboard
   - **Utendørs**: Ser GPS-koordinater og bilde
   - **Innendørs**: Ser QR-kode som kan skannes ved ankomst
   - Kan sende melding til utleier hvis spørsmål

5. **Under parkering**
   - Kan sende melding til utleier
   - Kan se gjenværende tid på booking
   - Kan avbestille (kun hvis mer enn 30 min igjen)

### Avbestilling
1. **Leietaker avbestiller**
   - Går til aktiv booking i dashboard
   - Klikker "Avbestill"
   - Ser informasjon om avbestillingsregler (30 min før)
   - Bekrefter avbestilling
   - Får automatisk refundering
   - Utleier får varsel om avbestilling

---

## Funksjonelle Krav (Functional Requirements)

### Autentisering og Brukerhåndtering
- **FR-001**: Systemet skal støtte registrering av både utleiere og leietakere
- **FR-002**: Systemet skal kreve e-postverifisering ved registrering
- **FR-003**: Systemet skal støtte innlogging med e-post og passord
- **FR-004**: Systemet skal støtte passordreset via e-post
- **FR-005**: Systemet skal lagre brukerprofil med navn, e-post, telefonnummer

### Parkeringsopprettelse (Utleier)
- **FR-006**: Utleier skal kunne legge til parkeringsplass med type (utendørs/innendørs)
- **FR-007**: For utendørs plasser skal systemet lagre GPS-koordinater og bilde
- **FR-008**: For innendørs plasser skal systemet generere unik QR-kode automatisk
- **FR-009**: Systemet skal foreslå pris basert på lokasjon og type
- **FR-010**: Utleier skal kunne redigere og slette egne parkeringsplasser
- **FR-011**: Systemet skal validere at adresse er korrekt og innenfor lokal geografisk omfang

### Søk og Booking (Leietaker)
- **FR-012**: Systemet skal vise alle tilgjengelige parkeringsplasser på kart
- **FR-013**: Systemet skal støtte søk basert på adresse eller GPS-lokasjon
- **FR-014**: Systemet skal støtte filtrering på dato, tid, pris, type og avstand
- **FR-015**: Systemet skal sjekke tilgjengelighet basert på eksisterende bookinger
- **FR-016**: Systemet skal beregne totalpris basert på valgt tidsperiode
- **FR-017**: Systemet skal kreve godkjenning av avtalevilkår før booking
- **FR-018**: Systemet skal håndtere betaling automatisk ved booking
- **FR-019**: Systemet skal generere QR-kode for innendørs bookinger

### Avbestilling
- **FR-020**: Leietaker skal kunne avbestille booking kun hvis det er mer enn 30 minutter igjen til oppstart
- **FR-021**: Systemet skal automatisk refundere betaling ved avbestilling
- **FR-022**: Systemet skal varsle utleier ved avbestilling

### Kommunikasjon
- **FR-023**: Systemet skal støtte meldingsutveksling mellom utleier og leietaker
- **FR-024**: Meldinger skal være knyttet til spesifikke bookinger
- **FR-025**: Systemet skal varsle brukere om nye meldinger

### Notifikasjoner
- **FR-026**: Systemet skal sende e-postvarsel ved bookingbekreftelse
- **FR-027**: Systemet skal sende e-postvarsel ved avbestilling
- **FR-028**: Systemet skal sende påminnelse 1 time før booking starter
- **FR-029**: Systemet skal sende varsel om nye meldinger

### Dashboard og Oversikt
- **FR-030**: Utleier skal se oversikt over alle egne parkeringsplasser
- **FR-031**: Utleier skal se alle aktive og kommende bookinger
- **FR-032**: Utleier skal se transaksjonshistorikk og inntekter
- **FR-033**: Leietaker skal se alle aktive bookinger
- **FR-034**: Leietaker skal se historikk over tidligere bookinger
- **FR-035**: Leietaker skal se tilgangsinformasjon (GPS, bilde, QR-kode) for aktive bookinger

### Avtalevilkår
- **FR-036**: Systemet skal vise avtalevilkår ved booking
- **FR-037**: Systemet skal kreve eksplisitt godkjenning av avtalevilkår
- **FR-038**: Systemet skal lagre godkjenninger med timestamp

---

## Hovedskjermer og Navigasjon

### Offentlige Sider (Ikke innlogget)
- **Landingsside**: Introduksjon til Parkshare, "Bli utleier" og "Finn parkering" CTA
- **Registrering**: Skjema for å opprette konto (velg utleier/leietaker)
- **Innlogging**: Skjema for innlogging

### Utleier-dashboard (Etter innlogging)
- **Hjem/Dashboard**: Oversikt over parkeringsplasser, aktive bookinger, inntekter
- **Mine parkeringsplasser**: Liste/kart over alle parkeringsplasser
- **Legg til parkeringsplass**: Skjema for å legge til ny parkeringsplass
- **Rediger parkeringsplass**: Skjema for å redigere eksisterende plass
- **Bookinger**: Oversikt over alle bookinger (aktive, kommende, historikk)
- **Meldinger**: Chat-oversikt og individuelle samtaler
- **Innstillinger/Profil**: Rediger brukerinformasjon

### Leietaker-dashboard (Etter innlogging)
- **Hjem/Søk**: Kartvisning med søk og filtrering
- **Parkeringsplass-detaljer**: Detaljert visning av en parkeringsplass
- **Booking**: Steg-for-steg bookingprosess
- **Mine bookinger**: Oversikt over aktive og tidligere bookinger
- **Booking-detaljer**: Detaljert visning av en booking med tilgangsinformasjon
- **Meldinger**: Chat-oversikt og individuelle samtaler
- **Innstillinger/Profil**: Rediger brukerinformasjon

### Delte Komponenter
- **Navigasjonsmeny**: Header med logo, navigasjon og brukerprofil
- **Footer**: Kontaktinfo, lenker til avtalevilkår, personvern, etc.
- **Chat-interface**: Meldingsvisning og input-felt
- **Kartkomponent**: Interaktivt kart med markører for parkeringsplasser

---

## Teknologistack

### Valgte Teknologier
- **Frontend/Backend Framework**: Next.js 14 (App Router) med TypeScript
  - Valgt for: Fullstack capabilities, server-side rendering, API routes, optimalisert for produksjon
- **Styling**: Tailwind CSS
  - Valgt for: Rask utvikling, konsistent design, responsivt design ut av boksen
- **Database**: PostgreSQL med Prisma ORM
  - Valgt for: Type-safe database queries, migrations, god utvikleropplevelse
- **Autentisering**: NextAuth.js
  - Valgt for: Enkel integrasjon med Next.js, støtte for flere providers, session management
- **State Management**: Zustand
  - Valgt for: Enkel API, liten bundle size, perfekt for React
- **Data Fetching**: TanStack Query (React Query)
  - Valgt for: Caching, automatisk refetching, optimalisert data fetching
- **Kart**: Leaflet/React-Leaflet
  - Valgt for: Open-source, fleksibel, god dokumentasjon
- **QR-koder**: qrcode library
  - Valgt for: Enkel generering av QR-koder
- **Validering**: Zod
  - Valgt for: Type-safe schema validering

### Miljøvariabler
Se `.env.example` for nødvendige miljøvariabler:
- DATABASE_URL
- NEXTAUTH_URL og NEXTAUTH_SECRET
- SMTP-innstillinger for e-post
- Stripe-nøkler for betalinger
- Mapbox token (valgfritt)

---

## Project Status Board

| Oppgave | Status | Notater |
|---------|--------|---------|
| Avklare produktbehov | ✅ Complete | Alle 10 spørsmål besvart |
| Planleggingsdokument | ✅ Complete | Detaljert plan opprettet |
| Prosjektoppsett | ✅ Complete | Next.js prosjekt opprettet med TypeScript, Tailwind, Prisma |
| Database Schema | ✅ Complete | Prisma schema definert med alle modeller |
| Grunnleggende Routing | ✅ Complete | App Router struktur opprettet |
| Autentisering Setup | ✅ Complete | NextAuth konfigurert, signin/signup sider implementert |
| Brukerregistrering API | ✅ Complete | API route for registrering med validering |
| Dashboard Side | ✅ Complete | Grunnleggende dashboard med brukertype-basert visning |
| Middleware | ✅ Complete | Beskyttelse av dashboard-ruter |
| Parkeringsopprettelse API | ✅ Complete | CRUD API routes for parkeringsplasser |
| Prisforslagsalgoritme | ✅ Complete | Beregning av foreslått pris basert på type |
| QR-kode generering | ✅ Complete | QR-kode generering for innendørs plasser |
| Parkeringsopprettelse UI | ✅ Complete | Skjema for å opprette parkeringsplass med GPS og validering |
| Parkeringsopprettelse Oversikt | ✅ Complete | Oversikt over alle parkeringsplasser for utleier |
| Parkeringsopprettelse Detaljside | ✅ Complete | Detaljside med redigeringsmulighet |
| Booking Oversikt | ✅ Complete | Visning av alle bookinger med filtrering |
| Inntektsoversikt | ✅ Complete | Oversikt over inntekter per periode og parkeringsplass |
| Søk og kartvisning | ✅ Complete | Implementert søk med Leaflet kart og filtrering |
| Parkeringsopprettelse visning | ✅ Complete | Detaljside for leietakere med bookingmulighet |
| Bookingprosess | ✅ Complete | Bookingflyt med avtalevilkår og validering |
| Bookingdetaljer | ✅ Complete | Detaljside med tilgangsinformasjon og avbestilling |
| Avbestillingsfunksjonalitet | ✅ Complete | Avbestilling med 30-minutters regel |
| Meldingssystem API | ✅ Complete | API routes for å hente og sende meldinger |
| Meldingssystem UI | ✅ Complete | MessageThread komponent integrert i booking-detaljer |
| Uleste meldinger indikator | ✅ Complete | Badge i dashboard som viser antall uleste meldinger |
| E-postnotifikasjoner | ✅ Complete | Resend.com integrasjon med templates for booking, avbestilling, meldinger |
| Booking-påminnelser | ✅ Complete | Cron job for å sende påminnelser 1 time før oppstart |
| Passordreset | ✅ Complete | Full passordreset-funksjonalitet med e-postlink og sikker token |
| Brukerprofil-redigering | ✅ Complete | Profilside med redigering av navn, telefon og passord |
| Stripe betalingsintegrasjon | ✅ Complete | Payment Intent, webhook, refundering ved avbestilling |
| Betalingsformular | ✅ Complete | Stripe Elements integrasjon i booking-flyten |
| Meldingssystem API | ✅ Complete | API routes for å hente og sende meldinger |
| Meldingssystem UI | ✅ Complete | MessageThread komponent integrert i booking-detaljer |
| Uleste meldinger indikator | ✅ Complete | Badge i dashboard som viser antall uleste meldinger |

---

## Executor's Feedback or Assistance Requests

### Sikkerhetsadvarsler
- **ESLint sårbarhet**: Det er en CLI-sårbarhet i `glob` pakken som brukes av `eslint-config-next`. Dette påvirker ikke runtime, men bør oppdateres senere. Krever oppgradering av ESLint til v9 (breaking change).

### Neste Steg
1. ✅ Implementere autentiserings-UI (signin/signup sider) - FERDIG
2. ✅ Opprette parkeringsplass-opprettelse for utleiere - FERDIG
3. Sett opp database (kjøre Prisma migrations når DATABASE_URL er konfigurert)
4. Implementere e-postverifisering (krever SMTP-innstillinger)
5. Implementere redigering av parkeringsplasser
6. Implementere søk og kartvisning for leietakere
7. Implementere booking-funksjonalitet
8. Implementere bildeopplasting (i stedet for URL)

---

## Lessons

1. **Next.js i ikke-tom mappe**: `create-next-app` vil ikke opprette prosjekt i mappe med eksisterende filer. Løsning: Opprett filer manuelt eller bruk `--force` (ikke anbefalt).
2. **Prisma Schema Design**: Viktig å tenke gjennom relasjoner og indekser tidlig. Har lagt til indekser for vanlige queries (bookingId, userId, tidsbaserte queries).
3. **Type Safety**: Bruk TypeScript og Zod for maksimal type safety gjennom hele stacken.
4. **Miljøvariabler**: Husk å dokumentere alle nødvendige miljøvariabler i `.env.example` (kan ikke committes pga globalignore, men dokumenteres i README).
5. **NextAuth Pages**: NextAuth støtter ikke `signUp` i `pages`-optionen. Bruk egen route for registrering.
6. **Type Assertions**: Vær nøye med type assertions i TypeScript, spesielt når man jobber med union types som "UTLEIER" | "LEIETAKER".
7. **Build Testing**: Alltid test build før man går videre for å fange type-feil tidlig.
8. **QR-kode bibliotek**: qrcode biblioteket har spesifikke options - `quality` og `type` er ikke gyldige for `toDataURL`. Bruk kun `errorCorrectionLevel`, `margin`, og `color`.
9. **GPS-lokasjon**: Bruk `navigator.geolocation` API for å hente brukerens nåværende posisjon. Husk å håndtere feil og tillatelser.
10. **Prisforslag**: Implementert enkel algoritme som kan utvides senere med faktiske geografiske data og markedsanalyse.
11. **Next.js Dynamic Routes**: API routes som bruker `getServerSession` må eksportere `export const dynamic = "force-dynamic"` for å unngå static rendering errors.
12. **React Hook Dependencies**: Når funksjoner brukes i useEffect dependencies, må de enten være i dependency array eller disable eslint-regelen. Bruk `eslint-disable-next-line react-hooks/exhaustive-deps` når funksjonen er definert i samme komponent.
13. **Form Labels**: Alltid bruk `htmlFor` på labels og `id` på inputs for tilgjengelighet og linting.
14. **Button Types**: Alltid spesifiser `type="button"` på buttons som ikke er submit-knapper i forms.
15. **useSearchParams Suspense**: Next.js krever at `useSearchParams()` wrappes i Suspense boundary for å unngå prerendering errors.
16. **Leaflet Types**: Leaflet krever eksplisitte tuple types `[number, number]` for koordinater, ikke bare `number[]`.
17. **Connection Pooling vs Direct**: Prisma migrations fungerer ikke med connection pooling (pgbouncer). Bruk direkte connection for migrations, pooling kan brukes for runtime.
18. **Lokal PostgreSQL**: For utvikling er lokal PostgreSQL enklere enn Supabase - ingen IP whitelisting eller nettverksproblemer.

