# Sentry Setup Guide - Hvordan få tilgang til logs

Denne guiden viser deg hvordan du setter opp Sentry og får tilgang til error logs.

## Steg 1: Opprett Sentry-konto

1. Gå til https://sentry.io
2. Klikk på "Sign Up" (eller "Log In" hvis du allerede har konto)
3. Opprett en gratis konto (gratis tier inkluderer 5,000 events/måned)

## Steg 2: Opprett et prosjekt

1. Etter innlogging, klikk på "Create Project"
2. Velg **"Next.js"** som platform
3. Gi prosjektet et navn (f.eks. "Parkshare")
4. Velg organisasjon (eller opprett ny)
5. Klikk "Create Project"

## Steg 3: Hent DSN (Data Source Name)

1. Etter at prosjektet er opprettet, vil Sentry vise deg **DSN** (Data Source Name)
2. DSN ser ut som: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
3. **Kopier denne DSN-en** - du trenger den i neste steg

**Alternativt:** Du kan alltid finne DSN senere ved å:
- Gå til prosjektet ditt i Sentry Dashboard
- Klikk på **Settings** → **Projects** → Velg ditt prosjekt
- Under **Client Keys (DSN)**, finner du DSN-en

## Steg 4: Konfigurer miljøvariabler

### For lokal utvikling (.env.local)

```bash
# Sentry DSN
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"

# Valgfritt: For source maps (anbefalt)
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="your-project-slug"
```

### For produksjon (Vercel/andre plattformer)

1. Gå til ditt deployment-dashboard (f.eks. Vercel)
2. Gå til **Settings** → **Environment Variables**
3. Legg til:
   - `NEXT_PUBLIC_SENTRY_DSN` = din DSN
   - `SENTRY_ORG` = din organisasjon (valgfritt)
   - `SENTRY_PROJECT` = ditt prosjektnavn (valgfritt)

## Steg 5: Deploy eller restart server

Etter at miljøvariablene er satt:

1. **For lokal utvikling:**
   ```bash
   # Restart dev server
   npm run dev
   ```

2. **For produksjon:**
   - Deploy applikasjonen på nytt (Vercel vil automatisk redeploy ved endringer i env vars)

## Steg 6: Aksesser Sentry Dashboard

1. Gå til https://sentry.io
2. Logg inn
3. Velg ditt prosjekt fra dashboard
4. Du vil nå se:
   - **Issues**: Alle feil og errors som er fanget opp
   - **Performance**: Performance metrics
   - **Releases**: Versjoner av applikasjonen din

## Steg 7: Test at det fungerer

### Test 1: Trigger en test-feil

Du kan teste Sentry ved å legge til en test-feil i koden:

```typescript
// I en API route eller komponent
import * as Sentry from "@sentry/nextjs"

// Test error
Sentry.captureException(new Error("Test error from Parkshare"))
```

Eller bruk logger:

```typescript
import { logger } from "@/lib/logger"

logger.error("Test error", new Error("Test error message"), { test: true })
```

### Test 2: Sjekk Sentry Dashboard

1. Gå til Sentry Dashboard
2. Du skal se en ny "Issue" med test-feilen
3. Klikk på issue for å se detaljer:
   - Stack trace
   - Request data
   - User context
   - Browser/device info

## Hvordan se logs i Sentry

### 1. Issues (Feil)

- **Sted:** Sentry Dashboard → Ditt prosjekt → **Issues**
- **Hva du ser:** Liste over alle feil som er oppstått
- **Informasjon:**
  - Feilmelding
  - Antall ganger feilen har skjedd
  - Siste gang feilen skjedde
  - Brukere som er påvirket

### 2. Issue Details

Klikk på en issue for å se:
- **Stack Trace**: Hvor feilen oppstod i koden
- **Breadcrumbs**: Hva som skjedde før feilen
- **User Context**: Hvilken bruker som opplevde feilen
- **Request Data**: HTTP request detaljer
- **Environment**: Hvilket miljø (production/development)
- **Release**: Hvilken versjon av applikasjonen

### 3. Performance Monitoring

- **Sted:** Sentry Dashboard → **Performance**
- **Hva du ser:** Performance metrics for API calls og side loads
- **Informasjon:**
  - Response times
  - Slowest endpoints
  - Database query times

### 4. Session Replay

- **Sted:** Sentry Dashboard → Issue → **Replay**
- **Hva du ser:** Video replay av hva brukeren gjorde før feilen
- **Notat:** Krever at Session Replay er aktivert (allerede konfigurert)

## Tips og triks

### Filtrere issues

- **Status:** Unresolved, Resolved, Ignored
- **Environment:** Production, Development
- **Release:** Spesifikk versjon
- **User:** Spesifikk bruker
- **Search:** Søk etter spesifikke feilmeldinger

### Sette opp alerts

1. Gå til **Settings** → **Alerts**
2. Opprett en alert for:
   - Nye issues
   - Issues som skjer ofte
   - Issues i produksjon

### Integrere med Slack/Email

1. Gå til **Settings** → **Integrations**
2. Velg Slack, Email, eller andre tjenester
3. Konfigurer notifikasjoner for nye issues

## Troubleshooting

### Sentry sender ikke events

1. **Sjekk DSN:**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   - Må være satt og korrekt

2. **Sjekk at du er i produksjon:**
   - Sentry sender kun events i production med mindre DSN er eksplisitt satt
   - I development, sett `NEXT_PUBLIC_SENTRY_DSN` for å teste

3. **Sjekk Sentry Dashboard:**
   - Gå til **Settings** → **Projects** → **Client Keys**
   - Verifiser at DSN matcher det du har i miljøvariabler

### Events vises ikke i Sentry

1. Vent noen sekunder (events kan ta litt tid)
2. Sjekk at applikasjonen faktisk sender events (sjekk network tab)
3. Verifiser at DSN er korrekt
4. Sjekk Sentry Dashboard for eventuelle feilmeldinger

### Source maps mangler

For bedre stack traces, sett opp source maps:

1. Sett `SENTRY_ORG` og `SENTRY_PROJECT` i miljøvariabler
2. Sentry vil automatisk laste opp source maps ved build
3. Stack traces vil nå vise faktisk kode i stedet for minified kode

## Neste steg

Etter at Sentry er satt opp:

1. ✅ Test at det fungerer (trigger en test-feil)
2. ✅ Sett opp alerts for kritiske feil
3. ✅ Integrer med Slack/Email for notifikasjoner
4. ✅ Overvåk produksjon for nye issues

## Hjelp

- Sentry dokumentasjon: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry support: https://sentry.io/support/

