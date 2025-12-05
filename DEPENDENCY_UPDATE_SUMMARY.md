# Dependency Update Summary

**Dato:** $(date)

## ✅ Oppdaterte Pakker

### Dependencies (Production)
- `@prisma/client`: `^5.19.0` → `^5.22.0` ✅
- `@stripe/react-stripe-js`: `^5.4.0` → `^5.4.1` ✅
- `@stripe/stripe-js`: `^8.5.2` → `^8.5.3` ✅
- `@tanstack/react-query`: `^5.28.0` → `^5.90.11` ✅
- `next`: `^14.2.0` → `^14.2.33` ✅
- `react`: `^18.3.0` → `^18.3.1` ✅
- `react-dom`: `^18.3.0` → `^18.3.1` ✅
- `zod`: `^3.23.0` → `^3.25.76` ✅
- `zustand`: `^4.5.0` → `^4.5.7` ✅

### DevDependencies
- `@types/node`: `^20.14.0` → `^20.19.25` ✅
- `@types/react`: `^18.3.0` → `^18.3.27` ✅
- `@types/react-dom`: `^18.3.0` → `^18.3.7` ✅
- `autoprefixer`: `^10.4.0` → `^10.4.20` ✅
- `eslint-config-next`: `^14.2.0` → `^14.2.33` ✅
- `postcss`: `^8.4.0` → `^8.4.47` ✅
- `prisma`: `^5.19.0` → `^5.22.0` ✅
- `tailwindcss`: `^3.4.0` → `^3.4.18` ✅
- `tsx`: `^4.20.6` → `^4.21.0` ✅
- `typescript`: `^5.5.0` → `^5.7.2` ✅

## ⚠️ Ikke Oppdatert (Breaking Changes)

Følgende pakker har major version updates tilgjengelig, men er ikke oppdatert for å unngå breaking changes:

- **Next.js**: `14.2.33` → `16.0.6` (major update)
- **React**: `18.3.1` → `19.2.0` (major update - krever Next.js 15+)
- **Prisma**: `5.22.0` → `6.19.0` (major update)
- **Zod**: `3.25.76` → `4.1.13` (major update)
- **Tailwind CSS**: `3.4.18` → `4.1.17` (major update)
- **react-leaflet**: `4.2.1` → `5.0.0` (major update)
- **zustand**: `4.5.7` → `5.0.9` (major update)
- **bcryptjs**: `2.4.3` → `3.0.3` (major update)

## 🔒 Sikkerhetsproblemer

### Høy Severitet
- **glob** (10.2.0 - 10.4.5): Command injection via -c/--cmd
  - **Lokasjon**: Dev-dependency via `eslint-config-next`
  - **Løsning**: Krever oppdatering til Next.js 16 (breaking change)
  - **Status**: ⚠️ Ikke fikset (krever major update)
  - **Risiko**: Lav (kun dev-dependency, påvirker ikke produksjon)

### Anbefaling
Sikkerhetsproblemet er i en dev-dependency og påvirker ikke produksjon. For å fikse det, må du:
1. Oppdatere til Next.js 16 (breaking changes)
2. Teste grundig etter oppdatering
3. Vurdere React 19 oppdatering (krever Next.js 15+)

## ✅ Kompatibilitet

- ✅ Alle oppdateringer er kompatible med Next.js 14
- ✅ Alle oppdateringer er kompatible med React 18
- ✅ Build fungerer uten feil
- ✅ Ingen breaking changes introdusert

## 📝 Notater

- Prisma 5.22.0 er den siste stabile versjonen i 5.x-serien
- Next.js 14.2.33 er den siste stabile versjonen i 14.x-serien
- React 18.3.1 er den siste stabile versjonen i 18.x-serien
- Alle TypeScript-typer er oppdatert til å matche React 18

