# Sentry Quick Start - Din DSN er konfigurert! ✅

Din Sentry DSN er nå lagt til i `.env.local`:

```
NEXT_PUBLIC_SENTRY_DSN="https://18d6a9498490468d0ea09d3b898b5479@o358770.ingest.us.sentry.io/4510510999142400"
```

## Neste steg

### 1. Restart dev server

```bash
# Stopp serveren (Ctrl+C) og start på nytt
npm run dev
```

### 2. Test at Sentry fungerer

Du kan teste Sentry ved å legge til en test-feil. Åpne en API route (f.eks. `app/api/test-sentry/route.ts`) og legg til:

```typescript
import { logger } from "@/lib/logger"
import { NextResponse } from "next/server"

export async function GET() {
  // Test error
  logger.error("Test error fra Parkshare", new Error("Dette er en test-feil"))
  
  return NextResponse.json({ 
    message: "Test error sendt til Sentry! Sjekk Sentry Dashboard om noen sekunder." 
  })
}
```

Gå deretter til `http://localhost:3000/api/test-sentry` i nettleseren.

### 3. Sjekk Sentry Dashboard

1. Gå til https://sentry.io
2. Logg inn
3. Velg ditt prosjekt
4. Gå til **Issues** - du skal se test-feilen om noen sekunder!

## Hvor finner jeg logs?

### I Sentry Dashboard:

1. **Issues** (hovedside): Se alle feil
   - Klikk på en issue for detaljer
   - Se stack trace, breadcrumbs, user context

2. **Performance**: Se performance metrics
   - Response times
   - Slowest endpoints

3. **Replays**: Se session replays
   - Video av hva brukeren gjorde før feilen

## For produksjon

Husk å legge til samme DSN i produksjonsmiljøvariablene:

### Vercel:
1. Gå til Vercel Dashboard
2. Velg prosjektet ditt
3. Settings → Environment Variables
4. Legg til:
   - Key: `NEXT_PUBLIC_SENTRY_DSN`
   - Value: `https://18d6a9498490468d0ea09d3b898b5479@o358770.ingest.us.sentry.io/4510510999142400`
5. Redeploy

### Andre plattformer:
Legg til samme miljøvariabel i ditt deployment-dashboard.

## Valgfritt: Source Maps (for bedre stack traces)

For å se faktisk kode i stedet for minified kode i stack traces:

1. Gå til Sentry Dashboard → Settings → Projects
2. Finn **Organization Slug** og **Project Slug**
3. Legg til i `.env.local`:
   ```bash
   SENTRY_ORG="din-org-slug"
   SENTRY_PROJECT="din-project-slug"
   ```

## Hjelp

- Se `docs/SENTRY_SETUP_GUIDE.md` for full dokumentasjon
- Sentry Dashboard: https://sentry.io
- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

