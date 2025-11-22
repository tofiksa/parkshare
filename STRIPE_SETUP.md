# Stripe Setup Guide for Parkshare

Denne guiden viser deg hvordan du setter opp Stripe for betalingsintegrasjon i Parkshare.

## Oversikt

Parkshare bruker Stripe for å håndtere:
- Betalinger ved booking
- Refundering ved avbestilling
- Webhook-håndtering for betalingsstatus

## Steg 1: Opprett Stripe-konto

1. Gå til https://stripe.com og opprett en konto
2. Verifiser e-postadresse og legg til grunnleggende informasjon
3. Aktiver test-modus (standard for nye kontoer)

## Steg 2: Hent API-nøkler

1. Gå til Stripe Dashboard: https://dashboard.stripe.com
2. Gå til **Developers** → **API keys**
3. Du vil se to nøkler:
   - **Publishable key** (`pk_test_...` eller `pk_live_...`)
   - **Secret key** (`sk_test_...` eller `sk_live_...`)

**For utvikling**: Bruk test-nøkler (starter med `test_`)
**For produksjon**: Bruk live-nøkler (starter med `live_`)

## Steg 3: Konfigurer miljøvariabler

Legg til følgende i din `.env.local` fil:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxx"
```

**Viktig**: `NEXT_PUBLIC_` prefikset er nødvendig for at nøkkelen skal være tilgjengelig i browseren.

## Steg 4: Sett opp Webhooks

Webhooks lar Stripe varsle applikasjonen din når betalinger er fullført eller feiler.

### For lokal utvikling (anbefalt)

1. **Installer Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows (med Chocolatey)
   choco install stripe
   
   # Linux
   # Se: https://stripe.com/docs/stripe-cli
   ```

2. **Logg inn på Stripe CLI:**
   ```bash
   stripe login
   ```

3. **Start webhook forwarding:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Kopier webhook secret:**
   - Stripe CLI vil gi deg en webhook secret som starter med `whsec_`
   - Legg denne til i `.env.local`:
     ```bash
     STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"
     ```

### For produksjon

1. Gå til Stripe Dashboard → **Developers** → **Webhooks**
2. Klikk **Add endpoint**
3. **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
4. **Events to send**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Klikk **Add endpoint**
6. Kopier **Signing secret** (starter med `whsec_`)
7. Legg til i produksjonsmiljøvariabler:
   ```bash
   STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"
   ```

## Steg 5: Test betalinger

Stripe tilbyr test-kortnummer for testing:

### Suksessfulle betalinger:
- **Kortnummer**: `4242 4242 4242 4242`
- **Utløpsdato**: Hvilket som helst fremtidig dato (f.eks. `12/34`)
- **CVC**: Hvilket som helst 3-sifret tall (f.eks. `123`)

### Feilende betalinger:
- **Kortnummer**: `4000 0000 0000 0002` (generisk avslag)
- **Kortnummer**: `4000 0000 0000 9995` (utilstrekkelige midler)

Se full liste: https://stripe.com/docs/testing

## Steg 6: Verifiser integrasjonen

1. **Start applikasjonen:**
   ```bash
   npm run dev
   ```

2. **Opprett en test-booking:**
   - Logg inn som leietaker
   - Søk etter en parkeringsplass
   - Opprett en booking

3. **Test betaling:**
   - Bruk test-kortnummer: `4242 4242 4242 4242`
   - Bekreft at betalingen går gjennom
   - Sjekk at booking-status oppdateres til `CONFIRMED`

4. **Test webhook:**
   - Sjekk Stripe Dashboard → **Developers** → **Events**
   - Du skal se `payment_intent.succeeded` event
   - Sjekk at webhook ble levert til din endpoint

## Steg 7: Produksjon

Før du går live:

1. **Bytt til live-nøkler:**
   - Gå til Stripe Dashboard → **Developers** → **API keys**
   - Klikk "Activate live mode"
   - Kopier live-nøklene og oppdater miljøvariabler

2. **Konfigurer produksjonswebhook:**
   - Følg steg 4 (For produksjon) ovenfor
   - Bruk produksjons-URL: `https://yourdomain.com/api/webhooks/stripe`

3. **Test i produksjon:**
   - Test med ekte kortnummer (start med små beløp)
   - Verifiser at webhooks fungerer
   - Test refundering ved avbestilling

## Troubleshooting

### "Stripe er ikke konfigurert"
- Sjekk at `STRIPE_SECRET_KEY` og `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` er satt i `.env.local`
- Restart utviklingsserveren etter å ha lagt til miljøvariabler

### "Webhook signature verification failed"
- Sjekk at `STRIPE_WEBHOOK_SECRET` er riktig
- For lokal utvikling: Bruk secret fra Stripe CLI (`stripe listen`)
- For produksjon: Bruk secret fra Stripe Dashboard

### Betaling feiler
- Sjekk at du bruker riktig test-kortnummer
- Sjekk Stripe Dashboard → **Developers** → **Logs** for feilmeldinger
- Verifiser at booking har riktig `totalPrice`

### Webhook mottas ikke
- For lokal utvikling: Sjekk at Stripe CLI kjører (`stripe listen`)
- For produksjon: Sjekk at endpoint-URL er korrekt i Stripe Dashboard
- Sjekk at serveren din er tilgjengelig fra internett (for produksjon)

## Ytterligere ressurser

- [Stripe Dokumentasjon](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Dokumentasjon](https://stripe.com/docs/stripe-cli)

