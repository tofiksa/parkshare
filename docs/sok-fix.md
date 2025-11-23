# Søkefunksjonalitet - Fix

## Problem
Søkesiden viste "Ingen parkeringsplasser funnet" selv når det fantes aktive parkeringsplasser i databasen.

## Løsning

### Endringer i `/app/api/parking-spots/search/route.ts`
- API-et returnerer nå alle aktive parkeringsplasser som standard når ingen filtre er satt
- Avstandsfiltering skjer kun hvis både GPS-koordinater OG maxDistance er gitt
- Hvis kun GPS-koordinater er gitt uten maxDistance, vises alle plasser

### Endringer i `/app/dashboard/search/page.tsx`
- maxDistance sendes kun med i søket hvis brukeren har GPS-koordinater
- Dette sikrer at søket fungerer både med og uten GPS

## Resultat
- Søkesiden viser nå alle aktive parkeringsplasser når den åpnes
- Filtrering fungerer som forventet når filtre settes
- GPS-basert søk fungerer når maxDistance er satt

