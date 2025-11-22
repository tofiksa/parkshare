import Stripe from "stripe"

// Stripe vil være undefined hvis STRIPE_SECRET_KEY ikke er satt
// Dette er OK for utvikling - betaling vil ikke fungere, men appen vil fortsatt kjøre
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    })
  : null

// Konverter NOK til øre (Stripe bruker minste valutaenhet)
export function convertNokToOre(amountNok: number): number {
  return Math.round(amountNok * 100)
}

// Konverter øre til NOK
export function convertOreToNok(amountOre: number): number {
  return amountOre / 100
}

