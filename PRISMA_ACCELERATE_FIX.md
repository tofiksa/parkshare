# Prisma Accelerate Schema Upload Fix

## Problem
Feilen "Schema needs to be uploaded" oppstår når Prisma Accelerate ikke har det siste schemaet.

## Løsning

### Alternativ 1: Last opp via Prisma Cloud Dashboard (Anbefalt)

1. Gå til https://console.prisma.io/
2. Logg inn med din Prisma Cloud-konto
3. Velg ditt prosjekt
4. Gå til "Accelerate" eller "Schema" seksjonen
5. Last opp `prisma/schema.prisma` filen manuelt

### Alternativ 2: Redeploy på Vercel

1. Gå til Vercel Dashboard
2. Sjekk at `DATABASE_URL` environment variable er satt riktig med Prisma Accelerate connection string:
   ```
   prisma+postgres://accelerate.prisma-data.net/?api_key=...
   ```
3. Trigger en ny deploy (push til GitHub eller manuell redeploy)
4. Under build vil `prisma generate` kjøre automatisk og laste opp schemaet

### Alternativ 3: Last opp via CLI (hvis du har Prisma Cloud CLI)

```bash
# Logg inn på Prisma Cloud
npx prisma login

# Last opp schemaet
npx prisma db push
```

## Verifisering

Etter å ha lastet opp schemaet, kan du verifisere at det fungerer ved å:
1. Teste søkefunksjonaliteten på `/dashboard/search`
2. Sjekke Prisma Cloud Dashboard for at schemaet er synkronisert

## Viktig for Vercel Deployment

Sørg for at følgende er konfigurert i `package.json`:
- ✅ `"build": "prisma generate && next build"` - Kjører prisma generate før build
- ✅ `"postinstall": "prisma generate"` - Sikrer at Prisma Client genereres etter install

Dette er allerede konfigurert i prosjektet.
