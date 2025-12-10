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

- **NEXT_PUBLIC_SENTRY_DSN**: Sentry DSN for error monitoring
  - Hent fra: https://sentry.io → Ditt prosjekt → Settings → Client Keys (DSN)
  - Format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
  - Se `docs/SENTRY_SETUP_GUIDE.md` for detaljert setup
- **SENTRY_ORG**: Sentry organisasjon (for source maps)
- **SENTRY_PROJECT**: Sentry prosjektnavn (for source maps)
- **UPSTASH_REDIS_REST_URL**: Upstash Redis URL for rate limiting
  - Hent fra: https://upstash.com → Redis database
- **UPSTASH_REDIS_REST_TOKEN**: Upstash Redis token for rate limiting
- **RESEND_API_KEY**: API-nøkkel fra Resend.com for e-postnotifikasjoner
  - Hent fra: https://resend.com/api-keys
  - Brukes for bookingbekreftelser, avbestillinger, meldinger og påminnelser
- **RESEND_FROM_EMAIL**: E-postadresse som sender e-poster (må være verifisert i Resend)
  - Format: `noreply@yourdomain.com` eller bruk `onboarding@resend.dev` for testing
- **CRON_SECRET**: Hemmelig nøkkel for å beskytte cron job routes
  - Generer med: `openssl rand -base64 32`
- **STRIPE_SECRET_KEY**: Stripe secret key for betalingsintegrasjon
  - Hent fra: https://dashboard.stripe.com/apikeys
  - Bruk test-nøkler (`sk_test_...`) for utvikling
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: Stripe publishable key (må starte med `NEXT_PUBLIC_`)
  - Hent fra: https://dashboard.stripe.com/apikeys
  - Bruk test-nøkler (`pk_test_...`) for utvikling
- **STRIPE_WEBHOOK_SECRET**: Webhook secret for å verifisere Stripe webhooks
  - Hent fra: Stripe Dashboard → Developers → Webhooks
  - Se Stripe-setup seksjonen nedenfor for detaljer
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

### Stripe Betalingsintegrasjon

Parkshare bruker Stripe for å håndtere betalinger. Følg disse stegene for å sette opp Stripe:

1. **Opprett Stripe-konto:**
   - Gå til https://stripe.com og opprett en konto
   - Verifiser e-postadresse og legg til grunnleggende informasjon

2. **Hent API-nøkler:**
   - Gå til Stripe Dashboard: https://dashboard.stripe.com
   - Gå til **Developers** → **API keys**
   - Du vil se to nøkler:
     - **Publishable key** (`pk_test_...` eller `pk_live_...`)
     - **Secret key** (`sk_test_...` eller `sk_live_...`)
   - **For utvikling**: Bruk test-nøkler (starter med `test_`)
   - **For produksjon**: Bruk live-nøkler (starter med `live_`)

3. **Konfigurer miljøvariabler:**
   ```bash
   STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxx"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxx"
   ```

4. **Sett opp Webhooks (for produksjon):**
   
   Webhooks lar Stripe varsle applikasjonen din når betalinger er fullført eller feiler.
   
   **For lokal utvikling:**
   - Bruk Stripe CLI for å videresende webhooks til lokal server:
     ```bash
     stripe listen --forward-to localhost:3000/api/webhooks/stripe
     ```
   - Stripe CLI vil gi deg en webhook secret som starter med `whsec_`
   - Sett denne i `.env.local`:
     ```bash
     STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"
     ```
   
   **For produksjon:**
   - Gå til Stripe Dashboard → **Developers** → **Webhooks**
   - Klikk **Add endpoint**
   - Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - Velg events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Kopier **Signing secret** (starter med `whsec_`)
   - Sett denne i produksjonsmiljøvariabler:
     ```bash
     STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"
     ```

5. **Test betalinger:**
   - Stripe tilbyr test-kortnummer for testing
   - Se: https://stripe.com/docs/testing
   - Eksempel test-kort: `4242 4242 4242 4242`
   - Bruk hvilket som helst fremtidig utløpsdato og CVC

6. **Refundering ved avbestilling:**
   - Refundering håndteres automatisk når en booking avbestilles
   - Refundering skjer kun hvis booking er betalt og mer enn 30 minutter før oppstart

**Viktig:** 
- Applikasjonen vil fungere uten Stripe-konfigurasjon, men betalinger vil ikke fungere
- For produksjon må du bruke live-nøkler og konfigurere webhooks
- Test alltid betalingsflyten grundig før produksjon

