# Supabase Setup Guide

## Steg-for-steg instruksjoner for å sette opp Supabase med Parkshare

### 1. Hent Connection String fra Supabase

1. Logg inn på [Supabase Dashboard](https://app.supabase.com)
2. Velg ditt prosjekt (eller opprett et nytt hvis du ikke har)
3. Gå til **Settings** → **Database**
4. Scroll ned til **Connection string** seksjonen
5. Velg **URI** tab
6. Du vil se noe som:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
7. Kopier denne strengen
8. **Viktig:** Erstatt `[YOUR-PASSWORD]` med ditt faktiske database passord
   - Ditt passord finner du i samme seksjon under "Database password"
   - Eller hvis du ikke husker det, kan du reset det i Settings → Database

### 2. Konfigurer .env.local

1. Kopier `.env.example` til `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Åpne `.env.local` i en teksteditor

3. Lim inn Supabase connection string i `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://postgres.xxxxx:your-password@db.xxxxx.supabase.co:5432/postgres"
   ```

### 3. Push Database Schema

Kjør følgende kommandoer for å opprette tabellene i Supabase:

```bash
# Generer Prisma Client
npx prisma generate

# Push schema til Supabase database
npx prisma db push
```

Dette vil opprette alle tabellene definert i `prisma/schema.prisma`:
- users
- parking_spots
- bookings
- messages
- terms_acceptances
- payments

### 4. Verifiser Setup

Du kan verifisere at alt fungerer ved å:

1. **Sjekke i Supabase Dashboard:**
   - Gå til **Table Editor** i Supabase Dashboard
   - Du skal se alle tabellene som er opprettet

2. **Eller bruk Prisma Studio:**
   ```bash
   npx prisma studio
   ```
   Dette åpner en web-basert database editor på http://localhost:5555

### 5. Test Applikasjonen

Start utviklingsserveren:
```bash
npm run dev
```

Gå til http://localhost:3000 og test registrering av en bruker. Dette vil lage en rad i `users` tabellen i Supabase.

## Troubleshooting

### Connection Error
- Sjekk at passordet i `DATABASE_URL` er korrekt
- Sjekk at du har riktig prosjekt-ref i connection string
- Verifiser at IP-adressen din er whitelisted i Supabase (Settings → Database → Connection pooling)

### Schema Push Feiler
- Sjekk at du har riktige rettigheter i Supabase
- Prøv å bruke connection string med `?pgbouncer=true` for connection pooling:
  ```
  postgresql://postgres.xxxxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

### Prisma Studio kan ikke koble til
- Bruk den direkte connection string (ikke pooler) for Prisma Studio
- Eller bruk Supabase Table Editor i stedet

## Neste Steg

Når databasen er satt opp, kan du:
1. Starte med å opprette brukere via registreringssiden
2. Legge til parkeringsplasser som utleier
3. Teste booking-funksjonalitet

