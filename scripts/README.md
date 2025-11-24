# Scripts

Denne mappen inneholder utility scripts for prosjektet.

## migrate-and-seed.ts

Kjører database-migrasjoner og seed test data i én operasjon.

### Bruk

**Rask metode (db push - anbefalt for utvikling):**
```bash
npm run db:migrate:seed
```

**Full metode (migrate dev - lager migration filer):**
```bash
npm run db:migrate:seed:full
```

Eller direkte:

```bash
# Rask (db push)
npx tsx scripts/migrate-and-seed.ts

# Full (migrate dev)
npx tsx scripts/migrate-and-seed.ts --migrate
```

### Hva gjør scriptet?

1. **Genererer Prisma Client** - Oppdaterer Prisma Client med siste schema-endringer
2. **Oppdaterer database schema** - To metoder:
   - **db push** (standard): Rask synkronisering, ingen migration filer. Best for utvikling.
   - **migrate dev** (med `--migrate` flag): Lager migration filer for versjonskontroll. Best for produksjon.
3. **Seeder test data** - Oppretter test-brukere, parkeringsplasser og bookinger

### Forskjell mellom db push og migrate dev

- **`db push`**: Synkroniserer schema direkte til databasen. Raskt og enkelt, men lager ikke migration filer. Best for utvikling og prototyping.
- **`migrate dev`**: Lager formelle migration filer i `prisma/migrations/`. Bedre for versjonskontroll og produksjon. Lar deg se historikk over alle schema-endringer.

### Krav

- `.env.local` fil må eksistere med `DATABASE_URL`
- Database må være tilgjengelig (PostgreSQL)

### Test-brukere

Etter kjøring vil følgende test-brukere være tilgjengelige:

**Utleier:**
- Email: `utleier@test.no`
- Passord: `test123456`

**Leietakere:**
- Email: `leietaker@test.no` / Passord: `test123456`
- Email: `leietaker2@test.no` / Passord: `test123456`
- Email: `leietaker3@test.no` / Passord: `test123456`

## seed-test-data.ts

Seeder test data til databasen. Kjøres automatisk av `migrate-and-seed.ts`, men kan også kjøres separat:

```bash
npm run db:seed
```

### Hva oppretter scriptet?

- **1 test utleier**:
  - Email: `utleier@test.no`
  - Passord: `test123456`
  - User type: `UTLEIER`

- **3 test leietakere**:
  - Email: `leietaker@test.no`, `leietaker2@test.no`, `leietaker3@test.no`
  - Passord: `test123456`
  - User type: `LEIETAKER`

- **18 parkeringsplasser** (alle aktive):
  - 10 i Oslo området
  - 8 i Trondheim området
  - Både utendørs (`UTENDORS`) og innendørs (`INNENDORS`)
  - Varierende priser (18-40 NOK/time)
  - Noen støtter ON_DEMAND booking, andre ikke

- **Test bookinger**:
  - Forskjellige statuser (PENDING, CONFIRMED, ACTIVE, COMPLETED, STARTED)
  - Både ADVANCE og ON_DEMAND bookinger
  - Tilhørende betalingsdata

### Notater

- Scriptet sletter eksisterende parkeringsplasser for test-utleier før det oppretter nye (for å unngå duplikater)
- Scriptet er idempotent - du kan kjøre det flere ganger trygt
- Test-brukere opprettes kun hvis de ikke allerede eksisterer

---

## Create GitHub Issue

Script for å opprette GitHub issues via GitHub API.

### Setup

1. **Opprett en GitHub Personal Access Token:**
   - Gå til: https://github.com/settings/tokens
   - Klikk "Generate new token (classic)"
   - Gi tokenet et navn (f.eks. "Parkshare Issue Creator")
   - Velg scope: `repo` (full kontroll over private repositories)
   - Klikk "Generate token"
   - **Kopier tokenet** (du vil ikke se det igjen!)

2. **Sett miljøvariabel:**
   ```bash
   export GITHUB_TOKEN=ghp_ditt_token_her
   ```
   
   Eller legg det til i din `.env.local` fil (husk å legge `.env.local` i `.gitignore` hvis den ikke allerede er der).

### Usage

**Fra fil:**
```bash
GITHUB_TOKEN=ghp_xxx node scripts/create-github-issue.js \
  "Bug: User type not correctly identified" \
  "$(cat BUG_REPORT.md)" \
  "bug,high priority"
```

**Med direkte tekst:**
```bash
GITHUB_TOKEN=ghp_xxx node scripts/create-github-issue.js \
  "Feature: Add dark mode" \
  "Beskrivelse av featuren her..." \
  "enhancement"
```

**Med npm script (hvis GITHUB_TOKEN er satt i miljøet):**
```bash
npm run github:issue -- "Bug: Title" "Body text" "bug,high"
```

### Parameters

1. **Title** (påkrevd): Tittel på issue
2. **Body** (valgfritt): Beskrivelse av issue (kan være tom)
3. **Labels** (valgfritt): Kommaseparert liste med labels (f.eks. "bug,high priority,frontend")

### Eksempel

```bash
# Opprett issue fra BUG_REPORT.md
GITHUB_TOKEN=ghp_xxx node scripts/create-github-issue.js \
  "Bug: User type not correctly identified in session" \
  "$(cat BUG_REPORT.md)" \
  "bug,high priority"
```

### Notes

- Tokenet trenger `repo` scope for å kunne opprette issues
- Scriptet bruker GitHub API v3
- Repository er satt til `tofiksa/parkshare` (kan endres i scriptet hvis nødvendig)

