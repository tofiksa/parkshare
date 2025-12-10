# Production Setup Guide

Denne guiden beskriver hvordan du setter opp produksjonsmiljøet med alle kritiske komponenter.

## Kritiske Komponenter

### 1. Sentry Error Monitoring

Sentry er konfigurert for å fange opp og rapportere feil i produksjon.

#### Setup

1. **Opprett Sentry-konto:**
   - Gå til https://sentry.io og opprett en konto
   - Opprett et nytt prosjekt (velg Next.js)

2. **Hent DSN:**
   - Fra Sentry Dashboard, kopier DSN (Data Source Name)
   - Format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

3. **Konfigurer miljøvariabel:**
   ```bash
   NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
   ```

4. **Valgfrie Sentry-innstillinger:**
   ```bash
   SENTRY_ORG="your-org"
   SENTRY_PROJECT="your-project"
   ```

#### Funksjonalitet

- Automatisk feilfangst i produksjon
- Session Replay for debugging
- Performance monitoring
- Source maps for bedre stack traces

**Notat:** Sentry vil ikke sende events i development med mindre `NEXT_PUBLIC_SENTRY_DSN` er satt.

### 2. Rate Limiting

Rate limiting er implementert for å beskytte mot misbruk og DDoS-angrep.

#### Setup

**Alternativ 1: Upstash Redis (Anbefalt for produksjon)**

1. **Opprett Upstash Redis:**
   - Gå til https://upstash.com og opprett en konto
   - Opprett en Redis database
   - Kopier REST URL og Token

2. **Konfigurer miljøvariabler:**
   ```bash
   UPSTASH_REDIS_REST_URL="https://xxxxx.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="xxxxx"
   ```

**Alternativ 2: In-Memory (Kun for development)**

Hvis Upstash ikke er konfigurert, vil systemet automatisk falle tilbake til in-memory rate limiting. Dette fungerer kun for single-instance deployments.

#### Rate Limits

Følgende rate limits er implementert:

- **Signup:** 5 requests per 15 minutter per IP
- **Forgot Password:** 5 requests per 15 minutter per IP
- **Booking Creation:** 10 requests per 5 minutter per bruker
- **Payment Intent:** 20 requests per 5 minutter per bruker

#### Customization

Du kan justere rate limits i `lib/rate-limit.ts` eller i de individuelle API-rutene.

### 3. Logging

Centralisert logging er implementert via `lib/logger.ts`.

#### Funksjonalitet

- **Development:** Logger alt til console
- **Production:** 
  - Errors og warnings sendes til Sentry
  - Debug logging er deaktivert (kan aktiveres med `ENABLE_DEBUG_LOGS=true`)

#### Bruk

```typescript
import { logger } from "@/lib/logger"

// Debug (kun i development)
logger.debug("Debug message", { context: "value" })

// Info
logger.info("Info message", { context: "value" })

// Warning (sendes til Sentry i production)
logger.warn("Warning message", { context: "value" })

// Error (sendes til Sentry i production)
logger.error("Error message", error, { context: "value" })
```

## Miljøvariabler

### Påkrevde for produksjon

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="..."

# Sentry (anbefalt)
NEXT_PUBLIC_SENTRY_DSN="https://..."

# Rate Limiting (anbefalt)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

### Valgfrie

```bash
# Sentry (for source maps)
SENTRY_ORG="your-org"
SENTRY_PROJECT="your-project"

# Debug logging
ENABLE_DEBUG_LOGS="true"
```

## Testing i Produksjon

Før du lanserer:

1. **Test Sentry:**
   - Trigger en test-feil i produksjon
   - Verifiser at feilen vises i Sentry Dashboard

2. **Test Rate Limiting:**
   - Prøv å gjøre flere requests raskt
   - Verifiser at rate limit-respons returneres

3. **Test Logging:**
   - Sjekk at errors logges korrekt
   - Verifiser at debug logging ikke vises i produksjon

## Troubleshooting

### Sentry sender ikke events

- Sjekk at `NEXT_PUBLIC_SENTRY_DSN` er satt
- Sjekk at DSN er korrekt
- Verifiser at du er i produksjon (development sender ikke events med mindre DSN er satt)

### Rate limiting fungerer ikke

- Sjekk at Upstash Redis er konfigurert (for produksjon)
- Verifiser at miljøvariablene er riktig satt
- Sjekk at rate limiting er implementert i API-ruten

### Logger sender ikke til Sentry

- Sjekk at Sentry er konfigurert
- Verifiser at du er i produksjon
- Sjekk Sentry Dashboard for events

