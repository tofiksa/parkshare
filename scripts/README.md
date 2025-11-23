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

