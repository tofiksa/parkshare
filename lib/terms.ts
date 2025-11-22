/**
 * Avtalevilkår for Parkshare
 * 
 * Dette dokumentet definerer vilkårene for bruk av Parkshare-plattformen
 * for utleie av private parkeringsplasser.
 */

export const TERMS_VERSION = "1.0"
export const TERMS_LAST_UPDATED = "2024-01-01"

export const TERMS_TEXT = `
AVTALEVILKÅR FOR PARKSHARE

1. OM AVTALEN
Denne avtalen regulerer forholdet mellom utleier og leietaker ved utleie av 
private parkeringsplasser gjennom Parkshare-plattformen. Ved booking av en 
parkeringsplass godtar både utleier og leietaker disse vilkårene.

2. BOOKING OG BETALING
2.1 Ved booking av parkeringsplass godtar leietaker å betale den oppgitte 
    prisen for valgt periode.
2.2 Betalingen behandles automatisk ved bookingbekreftelse gjennom 
    Parkshare sin betalingsløsning.
2.3 Prisen er inkludert alle avgifter og gebyrer, med unntak av eventuelle 
    ekstra tjenester som er eksplisitt oppgitt.

3. AVBESTILLING OG REFUNDERING
3.1 Leietaker kan avbestille booking innen 30 minutter før oppstart av 
    leieforholdet.
3.2 Ved avbestilling innen fristen vil leietaker få full refundering av 
    betalt beløp.
3.3 Ved avbestilling etter fristen eller ved ikke-oppmøte gis ingen 
    refundering.
3.4 Utleier kan ikke avbestille en bekreftet booking uten gyldig grunn.

4. BRUK AV PARKERINGSPLASS
4.1 Leietaker er ansvarlig for å bruke parkeringsplassen kun i den bookede 
    perioden.
4.2 For utendørs plasser skal leietaker følge GPS-koordinatene og bruke 
    oppgitt bilde for identifikasjon.
4.3 For innendørs plasser må leietaker bruke den tildelte QR-koden for 
    tilgang. QR-koden er personlig og må ikke deles med andre.
4.4 Leietaker skal ikke blokkere andre parkeringsplasser eller skape 
    ulemper for naboer.

5. ANSVAR OG FORSIKRING
5.1 Utleier er ikke ansvarlig for skade på kjøretøy, tyveri eller tap av 
    eiendeler.
5.2 Leietaker parkerer på eget ansvar og bør sikre at kjøretøyet er 
    forsikret.
5.3 Utleier skal sørge for at parkeringsplassen er i god stand og 
    tilgjengelig i den bookede perioden.
5.4 Ved skade på parkeringsplass eller tilhørende fasiliteter forårsaket av 
    leietaker, kan utleier kreve erstatning.

6. TILGJENGELIGHET OG FEIL
6.1 Utleier skal sørge for at parkeringsplassen er tilgjengelig i den 
    bookede perioden.
6.2 Ved teknisk feil eller uforutsett hendelse som gjør parkeringsplassen 
    utilgjengelig, skal utleier umiddelbart varsle leietaker.
6.3 Ved feil fra utleiers side vil leietaker få full refundering.

7. PERSONVERN
7.1 Parkshare behandler personopplysninger i henhold til gjeldende 
    personvernlovgivning.
7.2 Utleier og leietaker kan kommunisere gjennom Parkshare sin 
    meldingsfunksjon.
7.3 Kontaktinformasjon deles kun mellom utleier og leietaker for formål 
    knyttet til booking.

8. MISLIGHOLD
8.1 Ved mislighold av avtalen kan den misligholdende part holdes ansvarlig 
    for skader.
8.2 Parkshare forbeholder seg retten til å suspendere eller stenge kontoer 
    ved brudd på vilkårene.

9. ENDRINGER I VILKÅRENE
9.1 Parkshare kan endre disse vilkårene. Endringer vil bli varslet til 
    brukere.
9.2 Fortsatt bruk av plattformen etter endringer innebærer aksept av de 
    nye vilkårene.

10. LOVVALG OG TVISTER
10.1 Disse vilkårene er underlagt norsk lov.
10.2 Eventuelle tvister skal løses gjennom forhandlinger. Ved uenighet kan 
     saken tas opp med Forbrukertilsynet eller domstolene.

Ved booking bekrefter du at du har lest, forstått og aksepterer disse 
vilkårene.
`

export function getTermsSummary(): string {
  return `
Avtalevilkår - Hovedpunkter:

• Booking og betaling skjer automatisk ved bekreftelse
• Du kan avbestille innen 30 minutter før oppstart og få full refundering
• Du parkerer på eget ansvar - utleier er ikke ansvarlig for skade eller tyveri
• QR-kode (for innendørs) er personlig og må ikke deles
• Ved teknisk feil fra utleiers side får du full refundering

Ved å godkjenne aksepterer du de fullstendige avtalevilkårene.
  `.trim()
}

