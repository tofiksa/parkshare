# PWA Testing Guide for Parkshare

## 1. Grunnleggende PWA-testing

### Chrome/Edge (Desktop)

1. **Åpne appen:**
   ```
   http://localhost:3000
   ```

2. **Sjekk install-prompt:**
   - Vent 3 sekunder - du skal se en install-prompt nederst til høyre
   - Eller klikk på install-ikonet (➕) i adresselinjen

3. **Installer appen:**
   - Klikk "Installer" i prompten eller i adresselinjen
   - Appen åpnes i eget vindu (standalone mode)

4. **Verifiser installasjon:**
   - Appen skal åpnes uten nettleser-UI (ingen adresselinje)
   - Sjekk at ikonet vises i app-listen

### Chrome DevTools - Lighthouse

1. **Åpne DevTools:**
   - `F12` eller `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

2. **Kjør Lighthouse audit:**
   - Gå til "Lighthouse" tab
   - Velg "Progressive Web App"
   - Klikk "Analyze page load"
   - Vent på resultatene

3. **Sjekk score:**
   - Du bør få høy score (80-100) på:
     - ✅ Installable
     - ✅ Manifest valid
     - ✅ Service worker registered
     - ✅ Offline support

### Chrome DevTools - Application Tab

1. **Åpne Application tab:**
   - DevTools → "Application" tab

2. **Sjekk Manifest:**
   - Venstre meny → "Manifest"
   - Verifiser at alle felter er fylt ut
   - Sjekk at ikoner lastes

3. **Sjekk Service Worker:**
   - Venstre meny → "Service Workers"
   - Du skal se service worker registrert
   - Status skal være "activated and is running"

4. **Test Cache:**
   - Venstre meny → "Cache Storage"
   - Du skal se `parkshare-v1` og `parkshare-runtime-v1`
   - Sjekk at assets er cachet

5. **Test Offline:**
   - Venstre meny → "Service Workers"
   - Huk av "Offline" checkbox
   - Last inn siden på nytt
   - Siden skal fortsatt fungere

---

## 2. Testing på Android (Chrome)

### Metode 1: Via USB Debugging

1. **Aktiver USB Debugging:**
   - Gå til Settings → About phone
   - Trykk 7 ganger på "Build number"
   - Gå til Settings → Developer options
   - Aktiver "USB debugging"

2. **Koble til PC:**
   - Koble telefonen til PC med USB
   - Godkjenn USB debugging på telefonen

3. **Åpne Chrome DevTools:**
   - På PC: Chrome → `chrome://inspect`
   - Klikk "inspect" på din telefon

4. **Test PWA:**
   - Naviger til `http://[PC-IP]:3000` på telefonen
   - Du skal se install-banner øverst
   - Installer appen

### Metode 2: Direkte på telefon

1. **Finn IP-adressen til PC:**
   ```bash
   # Mac/Linux:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows:
   ipconfig
   ```

2. **Åpne på telefon:**
   - Sørg for at telefon og PC er på samme WiFi
   - Åpne Chrome på telefonen
   - Gå til: `http://[PC-IP]:3000`
   - Eksempel: `http://192.168.1.100:3000`

3. **Installer:**
   - Du skal se banner: "Legg til på hjemmeskjerm"
   - Eller: Menu (⋮) → "Legg til på hjemmeskjerm"

4. **Test appen:**
   - Åpne appen fra hjemmeskjermen
   - Den skal åpnes i standalone mode (uten nettleser-UI)

---

## 3. Testing på iOS (Safari)

### Metode 1: Via Safari på Mac

1. **Aktiver Web Inspector:**
   - På iPhone: Settings → Safari → Advanced → Web Inspector (ON)

2. **Koble til Mac:**
   - Koble iPhone til Mac med USB
   - På Mac: Safari → Develop → [Din iPhone] → [localhost:3000]

3. **Test PWA:**
   - Åpne Safari på iPhone
   - Gå til `http://[Mac-IP]:3000`
   - Del-knappen (□↑) → "Legg til på hjemmeskjerm"

### Metode 2: Direkte på iPhone

1. **Åpne Safari:**
   - Gå til `http://[PC-IP]:3000`

2. **Installer:**
   - Klikk del-knappen (□↑)
   - Velg "Legg til på hjemmeskjerm"
   - Bekreft

3. **Test appen:**
   - Åpne appen fra hjemmeskjermen
   - Den skal åpnes i standalone mode

**Merk:** iOS har noen begrensninger:
- Service worker fungerer, men med begrensninger
- Push notifications krever ekstra konfigurasjon
- Install prompt vises ikke automatisk (må gjøres manuelt)

---

## 4. Testing Offline-funksjonalitet

### Test 1: Basic Offline

1. **Installer appen først**

2. **Åpne Chrome DevTools:**
   - `F12` → Network tab

3. **Aktiver offline:**
   - Network tab → Velg "Offline" fra dropdown
   - Eller: Application tab → Service Workers → Huk av "Offline"

4. **Test:**
   - Last inn siden på nytt
   - Siden skal fortsatt fungere
   - Cachede ressurser skal lastes

### Test 2: Offline API-kall

1. **Gå til en side som bruker API:**
   - F.eks. `/dashboard/parking/map`

2. **Aktiver offline**

3. **Test:**
   - API-kall skal feile gracefully
   - Du skal se feilmeldinger i stedet for crash

### Test 3: Offline-fallback side

1. **Aktiver offline**

2. **Naviger til en side som ikke er cachet:**
   - Service worker skal vise `/offline` siden

---

## 5. Testing Service Worker

### Test 1: Registrering

1. **Åpne DevTools:**
   - Application tab → Service Workers

2. **Sjekk:**
   - Service worker skal være "activated and is running"
   - URL skal være `/sw.js`

3. **Console:**
   - Du skal se: "ServiceWorker registration successful"

### Test 2: Cache

1. **Application tab → Cache Storage**

2. **Sjekk caches:**
   - `parkshare-v1` - Precache assets
   - `parkshare-runtime-v1` - Runtime cache

3. **Sjekk innhold:**
   - Klikk på hver cache
   - Verifiser at assets er cachet

### Test 3: Update

1. **Endre service worker:**
   - Rediger `public/sw.js`
   - Endre `CACHE_NAME` til `parkshare-v2`

2. **Reload:**
   - Service worker skal oppdatere automatisk
   - Gamle caches skal slettes

---

## 6. Testing Install Prompt

### Test 1: Automatisk prompt

1. **Åpne appen i Chrome/Edge**

2. **Vent 3 sekunder:**
   - Install-prompten skal vises nederst til høyre

3. **Test avvisning:**
   - Klikk "Ikke nå"
   - Prompten skal ikke vises igjen i samme session

### Test 2: Manuell install

1. **Klikk install-ikonet i adresselinjen**

2. **Installer:**
   - Appen skal åpnes i standalone mode

### Test 3: Install-status

1. **Sjekk om appen er installert:**
   ```javascript
   // I browser console:
   window.matchMedia('(display-mode: standalone)').matches
   // Skal returnere true hvis installert
   ```

---

## 7. Testing på forskjellige nettlesere

### Chrome/Edge ✅
- Full PWA-støtte
- Install prompt fungerer
- Service worker fungerer perfekt

### Firefox ✅
- PWA-støtte (nyere versjoner)
- Install prompt fungerer
- Service worker fungerer

### Safari (macOS) ⚠️
- Begrenset PWA-støtte
- Install må gjøres manuelt
- Service worker fungerer, men med begrensninger

### Safari (iOS) ⚠️
- Begrenset PWA-støtte
- Install må gjøres manuelt
- Service worker fungerer, men med begrensninger

---

## 8. Verktøy for testing

### Lighthouse CLI

```bash
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

### PWA Builder

1. Gå til: https://www.pwabuilder.com/
2. Skriv inn URL: `http://localhost:3000`
3. Få detaljert analyse

### Web.dev Measure

1. Gå til: https://web.dev/measure
2. Skriv inn URL
3. Få PWA-score og forbedringsforslag

---

## 9. Checklist for PWA-testing

- [ ] Appen kan installeres på desktop
- [ ] Appen kan installeres på Android
- [ ] Appen kan installeres på iOS
- [ ] Install-prompt vises automatisk
- [ ] Service worker registreres
- [ ] Assets caches korrekt
- [ ] Appen fungerer offline
- [ ] Offline-side vises når nødvendig
- [ ] Manifest er valid
- [ ] Ikoner lastes korrekt
- [ ] Lighthouse score > 80
- [ ] Appen åpnes i standalone mode
- [ ] Theme color fungerer
- [ ] Shortcuts fungerer (hvis implementert)

---

## 10. Vanlige problemer og løsninger

### Problem: Install-prompt vises ikke
**Løsning:**
- Sjekk at HTTPS er aktivert (eller localhost)
- Sjekk at manifest er valid
- Sjekk at service worker er registrert

### Problem: Service worker registreres ikke
**Løsning:**
- Sjekk at `/sw.js` er tilgjengelig
- Sjekk console for feilmeldinger
- Sjekk at service worker er i `public/` mappen

### Problem: Appen fungerer ikke offline
**Løsning:**
- Sjekk at service worker cacher assets
- Sjekk Network tab for hvilke ressurser som feiler
- Sjekk Cache Storage for cachede ressurser

### Problem: Ikoner vises ikke
**Løsning:**
- Sjekk at ikon-rutene (`/icon-192`, `/icon-512`) fungerer
- Sjekk manifest for korrekte ikon-URLer
- Sjekk console for 404-feil

---

## 11. Testing med produksjons-URL

For å teste PWA fullt ut, må du teste med HTTPS:

1. **Deploy til produksjon** (Vercel, Netlify, etc.)
2. **Test med produksjons-URL**
3. **Alle PWA-funksjoner fungerer bedre med HTTPS**

---

## 12. Automatisk testing

### Jest + PWA testing

```javascript
// test/pwa.test.js
describe('PWA', () => {
  test('manifest is valid', async () => {
    const response = await fetch('/manifest.json');
    const manifest = await response.json();
    expect(manifest.name).toBeDefined();
    expect(manifest.icons).toBeDefined();
  });

  test('service worker exists', async () => {
    const response = await fetch('/sw.js');
    expect(response.ok).toBe(true);
  });
});
```

---

## Neste steg

Etter testing, vurder å implementere:
- Push notifications
- Background sync
- Share API
- Badge API
- Install events tracking

