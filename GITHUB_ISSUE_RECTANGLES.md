# Rektangler vises ikke på kartet ved zoom inn

## Beskrivelse
Parkeringsplasser skal vises som rektangler på kartet når brukeren zoomer inn til zoom level 12 eller høyere. Rektanglene skal være grønne med 50% opacity, og full-rektangler skal være lettere grønne enn vanlige rektangler. Dette fungerer ikke - kun P-ikoner vises, selv ved maksimal zoom.

## Forventet oppførsel
- Ved zoom level >= 12: Parkeringsplasser skal vises som grønne rektangler basert på deres koordinater (`rectNorthLat`, `rectSouthLat`, `rectEastLng`, `rectWestLng`)
- Ved zoom level < 12: Parkeringsplasser skal vises som P-ikoner
- Rektangler skal ha:
  - UTENDORS: `rgba(200, 255, 200, 0.5)` fill, `#10b981` border
  - INNENDORS: `rgba(144, 238, 144, 0.5)` fill, `#7CB342` border
  - `fillOpacity: 0.5`, `weight: 3`

## Faktisk oppførsel
- Kun P-ikoner vises på kartet, selv ved maksimal zoom (zoom level 19)
- Konsollen viser warnings: `⚠️ Spot [id] mangler rektangel-data: {hasRectCoords: false, hasRectSize: false, zoom: 19}`
- Noen ganger vises feilmelding: "Kunne ikke hente parkeringsplasser"

## Tekniske detaljer

### Database
- Rektangelkoordinater er lagret i databasen for alle aktive ON_DEMAND parkeringsplasser
- Felt: `rectNorthLat`, `rectSouthLat`, `rectEastLng`, `rectWestLng`, `rectWidthMeters`, `rectHeightMeters`
- Verifisert at data eksisterer i databasen (14 plasser har rektangelkoordinater)

### API-endepunkt
- `/api/parking-spots/map` - returnerer parkeringsplasser med rektangelkoordinater
- Bruker `include` for å hente alle felter fra `ParkingSpot`-modellen
- Type assertion brukes for å håndtere TypeScript-typer som ikke er oppdatert

### Frontend
- `app/dashboard/parking/map/page.tsx` - hovedkomponent for kartvisning
- `components/Map.tsx` - Leaflet-kartkomponent som håndterer rendering av rektangler/markører
- Zoom threshold: `>= 12` for å vise rektangler
- Debug logging er implementert for å spore dataflyt

## Feilmeldinger i konsoll
```
⚠️ Spot cmidy6e1a00013y4j4zvk5y89 mangler rektangel-data: 
{hasRectCoords: false, hasRectSize: false, zoom: 19}
```

## Hva som har blitt prøvd
1. ✅ Oppdatert Prisma schema med rektangelfelter
2. ✅ Seedet testdata med rektangelkoordinater
3. ✅ Regenerert Prisma Client
4. ✅ Endret API-rute fra `select` til `include` for å inkludere alle felter
5. ✅ Lagt til type assertions for å håndtere TypeScript-typer
6. ✅ Senket zoom threshold fra 14 til 12
7. ✅ Lagt til omfattende debug logging
8. ✅ Fikset `parkingSpotsRef` → `allParkingSpotsRef` referansefeil

## Mulige årsaker
1. **Data kommer ikke gjennom fra API til frontend**
   - Rektangelfeltene kan være `null` eller `undefined` i API-responsen
   - Type assertion kan ikke fungere korrekt ved runtime

2. **Frontend mottar ikke rektangeldata**
   - Data kan bli filtrert bort eller ikke mappes korrekt
   - TypeScript-typer kan forhindre at feltene blir tilgjengelige

3. **Rendering-logikk i Map-komponenten**
   - Betingelsen `showRectangles && spot.rectNorthLat && ...` kan feile
   - Leaflet `L.rectangle` kan ha problemer med koordinatene

## Testdata
- **Totalt:** 12 aktive ON_DEMAND plasser med rektangler
- **Oslo:** 5 plasser (f.eks. "Karl Johans gate 1", "Aker Brygge 10")
- **Trondheim:** 7 plasser (f.eks. "Dronning Blanca gate 8", "Munkegata 1")

Alle har:
- `rectNorthLat`, `rectSouthLat`, `rectEastLng`, `rectWestLng` (koordinater)
- `rectWidthMeters`, `rectHeightMeters` (størrelse i meter)

## Miljø
- Next.js 14.2.33
- Prisma 5.22.0
- Leaflet/React-Leaflet
- PostgreSQL database

## Prioritet
**Medium** - Funksjonaliteten er viktig for brukeropplevelse, men applikasjonen fungerer med P-ikoner som fallback.

## Akseptansekriterier
- [ ] Rektangler vises på kartet når zoom level >= 12
- [ ] Rektangler har riktig farge og opacity (grønn, 50% opacity)
- [ ] P-ikoner vises når zoom level < 12
- [ ] Rektangler kan klikkes og viser popup med parkeringsplass-info
- [ ] Ingen console warnings om manglende rektangel-data
- [ ] Fungerer for både UTENDORS og INNENDORS parkeringsplasser

## Relaterte filer
- `app/api/parking-spots/map/route.ts` - API-endepunkt
- `app/dashboard/parking/map/page.tsx` - Frontend kartside
- `components/Map.tsx` - Leaflet kartkomponent
- `prisma/schema.prisma` - Database schema
- `scripts/seed-test-data.ts` - Testdata seeding

## Notater
- Debug logging er allerede implementert og kan brukes til feilsøking
- Konsollen viser detaljert informasjon om dataflyt (API → Frontend → Map)
- Se konsoll for: `🔍 API - First spot rect data from DB`, `🔍 Frontend - First spot rect data`, `🗺️ Map render`

