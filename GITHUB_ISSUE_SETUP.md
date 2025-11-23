# GitHub Issue Integration Setup

Dette dokumentet beskriver hvordan du setter opp automatisk opprettelse av GitHub issues.

## Quick Start

1. **Opprett GitHub Personal Access Token:**
   ```bash
   # Gå til: https://github.com/settings/tokens
   # Klikk "Generate new token (classic)"
   # Velg scope: repo
   # Kopier tokenet
   ```

2. **Sett miljøvariabel:**
   ```bash
   export GITHUB_TOKEN=ghp_ditt_token_her
   ```
   
   For å gjøre det permanent, legg det til i din `~/.zshrc` eller `~/.bashrc`:
   ```bash
   echo 'export GITHUB_TOKEN=ghp_ditt_token_her' >> ~/.zshrc
   source ~/.zshrc
   ```

3. **Opprett issue:**
   ```bash
   # Fra BUG_REPORT.md
   ./scripts/create-issue-from-bug-report.sh
   
   # Eller manuelt
   node scripts/create-github-issue.js "Tittel" "Beskrivelse" "label1,label2"
   ```

## Detaljert Guide

### Steg 1: Opprett GitHub Personal Access Token

1. Gå til [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Klikk "Generate new token (classic)"
3. Gi tokenet et beskrivende navn (f.eks. "Parkshare Issue Creator")
4. Velg scope:
   - ✅ **repo** - Full kontroll over private repositories
     - Dette inkluderer rettigheter til å lese og skrive issues
5. Klikk "Generate token"
6. **VIKTIG**: Kopier tokenet umiddelbart - du vil ikke se det igjen!
   - Tokenet starter med `ghp_`

### Steg 2: Konfigurer Token

**Temporary (kun for denne terminal-sesjonen):**
```bash
export GITHUB_TOKEN=ghp_ditt_token_her
```

**Permanent (anbefalt):**
```bash
# For zsh (macOS default)
echo 'export GITHUB_TOKEN=ghp_ditt_token_her' >> ~/.zshrc
source ~/.zshrc

# For bash
echo 'export GITHUB_TOKEN=ghp_ditt_token_her' >> ~/.bashrc
source ~/.bashrc
```

**Alternativt: Legg i .env.local (ikke commit):**
```bash
# Legg til i .env.local
GITHUB_TOKEN=ghp_ditt_token_her

# Husk å eksportere før bruk
export $(cat .env.local | grep GITHUB_TOKEN | xargs)
```

### Steg 3: Test Tokenet

```bash
# Test at tokenet fungerer
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

Du skal få tilbake JSON med din brukerinformasjon.

### Steg 4: Opprett Issues

**Automatisk fra BUG_REPORT.md:**
```bash
./scripts/create-issue-from-bug-report.sh
```

**Manuelt med custom tittel og beskrivelse:**
```bash
node scripts/create-github-issue.js \
  "Bug: Tittel her" \
  "Beskrivelse av buggen..." \
  "bug,high priority"
```

**Med npm script:**
```bash
npm run github:issue -- "Tittel" "Beskrivelse" "labels"
```

## Troubleshooting

### "Bad credentials" (401)
- Tokenet er ugyldig eller utløpt
- Opprett et nytt token og oppdater `GITHUB_TOKEN`

### "Resource not accessible by integration" (403)
- Tokenet mangler nødvendige rettigheter
- Sjekk at tokenet har `repo` scope

### "Not Found" (404)
- Repository eksisterer ikke eller du har ikke tilgang
- Sjekk at `tofiksa/parkshare` er korrekt og at du har tilgang

### "Token ikke funnet"
- Sjekk at `GITHUB_TOKEN` er satt: `echo $GITHUB_TOKEN`
- Hvis tom, sett den: `export GITHUB_TOKEN=ghp_xxx`

## Sikkerhet

⚠️ **VIKTIG**: 
- **Ikke commit tokenet** til git
- Legg `GITHUB_TOKEN` i `.gitignore` hvis du bruker `.env.local`
- Tokenet gir full tilgang til repositoryet ditt
- Hvis tokenet lekker, revokér det umiddelbart fra GitHub Settings

## Scripts

- `scripts/create-github-issue.js` - Hovedscript for å opprette issues
- `scripts/create-issue-from-bug-report.sh` - Wrapper for å opprette issue fra BUG_REPORT.md

## Eksempler

```bash
# Opprett bug issue
node scripts/create-github-issue.js \
  "Bug: Login redirect ikke fungerer" \
  "Når bruker logger inn, blir de ikke redirectet til dashboard" \
  "bug"

# Opprett feature request
node scripts/create-github-issue.js \
  "Feature: Dark mode" \
  "Legg til dark mode toggle i navigasjonen" \
  "enhancement,ui"

# Opprett issue med flere labels
node scripts/create-github-issue.js \
  "Improvement: Bedre feilmeldinger" \
  "Forbedre feilmeldinger i booking-flyten" \
  "enhancement,ux,frontend"
```

