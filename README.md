# Parkshare

En webapplikasjon for utleie av private parkeringsplasser.

## Teknologistack

- **Frontend/Backend**: Next.js 14 (App Router) med TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL med Prisma ORM
- **Autentisering**: NextAuth.js
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Kart**: Leaflet/React-Leaflet
- **QR-koder**: qrcode

## Komme i gang

1. Installer avhengigheter:
```bash
npm install
```

2. Sett opp miljøvariabler:
```bash
cp .env.example .env.local
```

3. Sett opp database:
```bash
npm run db:generate
npm run db:push
```

4. Seed testdata (valgfritt, anbefalt for testing):
```bash
npm run db:seed
```

Dette oppretter:
- 1 test-utleier (`utleier@test.no` / `test123456`)
- 8 parkeringsplasser (5 utendørs, 3 innendørs) i Oslo-området

5. Kjør utviklingsserver:
```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## Teste Leietaker-funksjonalitet

Etter å ha kjørt `npm run db:seed`:

1. **Opprett leietaker-konto**: Gå til `/auth/signup` og velg "Leietaker" som brukertype
2. **Søk etter parkeringsplasser**: Gå til `/dashboard/search` for å se alle tilgjengelige plasser på kartet
3. **Book parkeringsplass**: Klikk på en plass, velg dato/tid, og bekreft booking
4. **Se dine bookinger**: Gå til `/dashboard/bookings` for å se alle dine bookinger
5. **Avbryt bookinger**: Avbryt bookinger innen 30 minutter etter opprettelse

## Miljøvariabler

Se `.env.example` for nødvendige miljøvariabler.

### Påkrevde variabler

- **DATABASE_URL**: PostgreSQL connection string
  - Format: `postgresql://[brukernavn]:[passord]@[host]:[port]/[databasenavn]?schema=public`
  - Eksempel lokalt: `postgresql://postgres:mypassword@localhost:5432/parkshare?schema=public`

- **NEXTAUTH_URL**: URL til applikasjonen
  - Lokal utvikling: `http://localhost:3000`
  - Produksjon: Din produksjons-URL

- **NEXTAUTH_SECRET**: Hemmelig nøkkel for NextAuth
  - Generer med: `openssl rand -base64 32`

### Valgfrie variabler

- **RESEND_API_KEY**: API-nøkkel fra Resend.com for e-postnotifikasjoner
  - Hent fra: https://resend.com/api-keys
  - Brukes for bookingbekreftelser, avbestillinger, meldinger og påminnelser
- **RESEND_FROM_EMAIL**: E-postadresse som sender e-poster (må være verifisert i Resend)
  - Format: `noreply@yourdomain.com` eller bruk `onboarding@resend.dev` for testing
- **CRON_SECRET**: Hemmelig nøkkel for å beskytte cron job routes
  - Generer med: `openssl rand -base64 32`
- **STRIPE_***: For betalingsintegrasjon (ikke implementert ennå)
- **MAPBOX_ACCESS_TOKEN**: For forbedret kartvisning (valgfritt)

### Database Setup (Supabase)

1. **Hent connection string fra Supabase:**
   - Gå til Supabase Dashboard: https://app.supabase.com
   - Velg ditt prosjekt
   - Gå til Settings → Database
   - Under "Connection string" → "URI" finner du connection string
   - Kopier connection string og erstatt `[YOUR-PASSWORD]` med ditt database passord

2. **Konfigurer miljøvariabler:**
   ```bash
   cp .env.example .env.local
   ```
   - Åpne `.env.local` og lim inn Supabase connection string i `DATABASE_URL`

3. **Push database schema:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

**Notat:** Supabase bruker PostgreSQL, så Prisma fungerer direkte. `prisma db push` vil opprette alle tabellene i Supabase-databasen din.

### E-postnotifikasjoner (Resend.com)

1. **Opprett konto på Resend.com:**
   - Gå til https://resend.com
   - Opprett gratis konto
   - Verifiser e-postadresse

2. **Hent API-nøkkel:**
   - Gå til API Keys i Resend Dashboard
   - Opprett ny API-nøkkel
   - Kopier nøkkelen

3. **Verifiser domene (valgfritt for produksjon):**
   - For produksjon: Legg til og verifiser ditt domene i Resend
   - For utvikling: Bruk `onboarding@resend.dev` som senderadresse

4. **Konfigurer miljøvariabler:**
   ```bash
   RESEND_API_KEY="re_xxxxxxxxxxxxx"
   RESEND_FROM_EMAIL="noreply@yourdomain.com"  # eller "onboarding@resend.dev" for testing
   ```

5. **Booking-påminnelser (Cron Job):**
   - Opprett en cron job som kaller `/api/cron/booking-reminders` hvert 10. minutt
   - Bruk `CRON_SECRET` i Authorization header: `Bearer ${CRON_SECRET}`
   - Eksempel med Vercel Cron: Legg til i `vercel.json`:
     ```json
     {
       "crons": [{
         "path": "/api/cron/booking-reminders",
         "schedule": "*/10 * * * *"
       }]
     }
     ```

