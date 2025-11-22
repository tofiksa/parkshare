"use client"

import { useState, useEffect, useCallback } from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"

// Only load Stripe if publishable key is available
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

interface PaymentFormProps {
  bookingId: string
  amount: number
  onSuccess: () => void
  onError: (error: string) => void
}

function CheckoutForm({ bookingId, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    try {
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke opprette betaling")
      }

      setClientSecret(data.clientSecret)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Kunne ikke laste betalingsinformasjon")
    }
  }, [bookingId, onError])

  useEffect(() => {
    fetchClientSecret()
  }, [fetchClientSecret])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    setProcessing(true)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      onError("Kortinformasjon ikke funnet")
      setProcessing(false)
      return
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (error) {
        onError(error.message || "Betaling feilet")
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess()
      }
    } catch (err) {
      onError("Noe gikk galt ved betaling")
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#424770",
        "::placeholder": {
          color: "#aab7c4",
        },
      },
      invalid: {
        color: "#9e2146",
      },
    },
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-300 rounded-lg">
        <CardElement options={cardElementOptions} />
      </div>
      <button
        type="submit"
        disabled={!stripe || processing || !clientSecret}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? "Behandler betaling..." : `Betal ${amount.toFixed(2)} NOK`}
      </button>
    </form>
  )
}

export default function PaymentForm(props: PaymentFormProps) {
  if (!stripePublishableKey || !stripePromise) {
    return (
      <div className="rounded-md bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          Stripe er ikke konfigurert. Booking vil bli opprettet uten betaling.
        </p>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  )
}

