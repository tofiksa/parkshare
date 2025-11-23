# Easypark-modell - Kort Oppsummering

## Hva er forskjellen?

### Nåværende modell (Forhåndsbooking)
- 📅 Velg dato og tid på forhånd
- 💳 Betal før parkering starter
- ⏰ Fast pris basert på valgt periode
- ✅ Fungerer godt for planlagte besøk

### Easypark-modell (Start/Stop)
- 🗺️ **Kartbasert valg** av parkeringsområde
- 🚗 **Start parkering** når du ankommer
- ⏱️ **Realtids timer** viser varighet
- 🛑 **Stopp parkering** når du vil
- 💰 **Betal etter parkering** (basert på faktisk tid)
- 📊 **Sammendrag** med detaljer etter stopp
- ✅ Fungerer godt for spontane besøk

## Hvordan fungerer det?

### 1. Velg Parkeringsområde (Kart)
```
Bruker åpner app → Ser kart
    ↓
Klikk på parkeringsområde på kartet
    ↓
Bottom sheet viser områdedetaljer
    ↓
Velg område
```

### 2. Bekreft Parkering
```
Vis valgt område (f.eks. "P 1720 Strømmen")
Vis kjøretøy (f.eks. "EV42193 Tesla")
Vis betalingsmetode (f.eks. "Apple Pay")
    ↓
Total: 0 kr (siden det er ON_DEMAND)
    ↓
Klikk "Start"
```

### 3. Start Parkering
```
GPS verifiserer at bruker er nær plassen
    ↓
Parkering starter, timer begynner
    ↓
Status: STARTED
```

### 4. Parkering Pågår
```
Realtids oppdatering:
- Stor sirkulær timer (f.eks. "26:52")
- "Utløper [tid]" under timeren
- Estimert pris oppdateres kontinuerlig
- "Stopp" knapp (stor lilla)
- "Endre varighet" knapp (hvit)
```

### 5. Stopp Parkering
```
Bruker klikker "Stopp"
    ↓
Bekreftelsesdialog: "Stopp parkering?"
    ↓
Bruker bekrefter
    ↓
Beregn faktisk varighet og pris
    ↓
Opprett betaling
```

### 6. Sammendrag (Etter Stopp)
```
Vis detaljer:
- Parkeringsområde
- Starttid og sluttid
- Varighet (minutter og sekunder)
- Kjøretøy
- Prisdetaljer:
  * Parkeringspris
  * Servicetillegg
  * Total inkl. MVA
    ↓
Betal via Stripe
    ↓
"Legg til notat" eller "Send kvittering"
```

## Tekniske endringer

### Database
- Ny `bookingType`: `ADVANCE` eller `ON_DEMAND`
- Ny status: `STARTED` (for pågående parkering)
- GPS-koordinater ved start og stopp
- Faktisk start/slutt-tid (separat fra planlagt)
- `durationMinutes` for faktisk varighet
- `pricePerMinute` for minuttbasert prising
- `vehiclePlate` for kjøretøyregistreringsnummer
- `zoneNumber` og `zoneName` for områdeidentifikasjon

### Nye API-endepunkter
- `GET /api/parking-spots/map` - Hent områder for kartvisning
- `POST /api/bookings/prepare` - Forbered start (bekreft)
- `POST /api/bookings/start` - Start parkering
- `GET /api/bookings/active` - Hent aktiv parkering
- `GET /api/bookings/[id]/estimate` - Realtids estimat
- `POST /api/bookings/[id]/stop` - Stopp parkering
- `GET /api/bookings/[id]/summary` - Hent sammendrag

### Nye sider
- `/dashboard/parking/map` - Kartvisning med områder
- `/dashboard/parking/confirm` - Bekreft parkering (før start)
- `/dashboard/parking/active` - Se aktiv parkering med timer
- `/dashboard/parking/summary/[id]` - Sammendrag etter stopp

### Nye komponenter
- `ParkingTimer` - Viser varighet og estimert pris
- `StopParkingDialog` - Bekreftelsesdialog for stopp
- `MapView` - Forbedret kartvisning med områder
- GPS-verifisering komponent

### Prisberegning
- **Minuttbasert**: `durationMinutes * pricePerMinute`
- Minimum 1 minutt
- Avrunding til 2 desimaler
- Realtids estimat for pågående parkering

## UI/UX (Basert på Easypark)

### Fargepalett
- **Primær:** Lilla/purple (#8B5CF6)
- **Sekundær:** Blå for parkeringsikoner
- **Suksess:** Grønn
- **Feil:** Rød

### Hovedskjermer

1. **Kartvisning**
   - Interaktivt kart med markører
   - Blå "P" ikoner for parkeringsområder
   - Bottom sheet med områdeliste
   - Søkefunksjon

2. **Bekreft Parkering**
   - Oversiktlig layout med kort
   - Vis alle detaljer før start
   - Stor "Start" knapp

3. **Aktiv Parkering**
   - Stor sirkulær timer
   - Realtids oppdatering
   - Klare action-knapper

4. **Sammendrag**
   - Detaljert oversikt
   - Prisdetaljer
   - Handlingsalternativer

## Hybrid-løsning

Applikasjonen støtter **begge modeller** samtidig:

- Utleiere kan velge hvilken modell de vil støtte per plass
- Leietakere kan velge mellom forhåndsbooking eller start/stop
- Eksisterende funksjonalitet påvirkes ikke

## Implementeringsplan

### Fase 1: Backend (1-2 uker)
- Database migrasjon
- GPS-verifisering
- Minuttbasert prising
- API-endepunkter

### Fase 2: Frontend (1-2 uker)
- Kartvisning
- Bekreft-siden
- Aktiv parkering med timer
- Sammendrag-side
- UI/UX forbedringer

### Fase 3: Testing (1 uke)
- Testing og bugfixes
- Optimalisering
- Mobile testing

## Fordeler

✅ **Fleksibilitet** - Støtter ulike bruksscenarier
✅ **Brukervennlig** - Enklere for spontane besøk
✅ **Rettferdig prising** - Betal kun for faktisk tid
✅ **Backward compatible** - Eksisterende funksjonalitet fungerer
✅ **Skalerbart** - Kan utvides med flere funksjoner
✅ **Kartbasert** - Intuitivt valg av område

## Neste steg

1. Review teknisk spesifikasjon
2. Godkjenn design
3. Start implementering
4. Test og iterasjon
5. Rollout

---

Se `easypark-modell-implementering.md` for full teknisk spesifikasjon.
