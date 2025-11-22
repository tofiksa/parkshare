# Contributing Guide - Conventional Commits

Dette prosjektet følger [Conventional Commits](https://www.conventionalcommits.org/) for commit-meldinger for å gjøre det enkelt å følge med på endringer og generere changelogs.

## Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Commit Types

- **feat**: Ny funksjonalitet (tilsvarer MINOR i semver)
- **fix**: Bugfix (tilsvarer PATCH i semver)
- **docs**: Dokumentasjon-endringer
- **style**: Formatering, UI-endringer som ikke påvirker funksjonalitet
- **refactor**: Kode-refaktorering som ikke legger til funksjonalitet eller fikser bugs
- **perf**: Ytelsesforbedringer
- **test**: Legge til eller endre tester
- **chore**: Vedlikehold, build-endringer, dependency updates
- **ci**: CI/CD endringer
- **build**: Build system eller eksterne avhengigheter

## Eksempler

### Feature
```bash
git commit -m "feat(booking): add terms acceptance storage

- Store TermsAcceptance record when booking is created
- Link acceptance to booking and user
- Add validation to ensure terms are accepted before booking"
```

### Bugfix
```bash
git commit -m "fix(payment): handle Stripe webhook errors gracefully

- Add error handling for failed webhook processing
- Log errors without failing the request
- Return 200 OK to prevent Stripe retries"
```

### Documentation
```bash
git commit -m "docs: add API endpoint documentation

- Document all booking endpoints
- Add request/response examples
- Include error codes and status codes"
```

### UI/Style
```bash
git commit -m "style(dashboard): improve card hover effects

- Add scale transform on hover
- Improve shadow transitions
- Enhance visual feedback"
```

### Refactoring
```bash
git commit -m "refactor(auth): extract session validation logic

- Create reusable session validation function
- Reduce code duplication across API routes
- Improve maintainability"
```

## Breaking Changes

For breaking changes, legg til `!` etter typen og `BREAKING CHANGE:` i body:

```bash
git commit -m "feat!(api): change booking status enum values

BREAKING CHANGE: Booking status values changed from lowercase to uppercase.
Old values: 'pending', 'confirmed', 'active'
New values: 'PENDING', 'CONFIRMED', 'ACTIVE'

Migration required for existing bookings."
```

## Scope (valgfritt)

Scope er valgfritt, men anbefalt for å spesifisere hvilken del av applikasjonen som er påvirket:

- `auth`: Autentisering og autorisasjon
- `booking`: Booking-funksjonalitet
- `payment`: Betalingsintegrasjon
- `ui`: Brukergrensesnitt
- `api`: API-endpoints
- `db`: Database og migrations
- `email`: E-postnotifikasjoner
- `docs`: Dokumentasjon

## Best Practices

1. **Bruk imperativ form** i subject (ikke "added feature" men "add feature")
2. **Ikke bruk punktum** i subject
3. **Hold subject under 50 tegn** hvis mulig
4. **Bruk body** for å forklare "hva" og "hvorfor", ikke "hvordan"
5. **Referer til issues** i footer hvis relevant: `Closes #123`

## Semver Mapping

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes (`feat!`, `fix!`)
- **MINOR** (1.0.0 → 1.1.0): Nye features (`feat`)
- **PATCH** (1.0.0 → 1.0.1): Bugfixes (`fix`)

## Automatisk Changelog

Med Conventional Commits kan vi automatisk generere changelogs ved hjelp av verktøy som:
- [standard-version](https://github.com/conventional-changelog/standard-version)
- [semantic-release](https://github.com/semantic-release/semantic-release)

