"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Navigation from "@/components/Navigation"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")
    
    if (!token) {
      setStatus("error")
      setMessage("Ingen verifiseringstoken funnet i lenken.")
      return
    }

    verifyEmail(token)
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus("error")
        setMessage(data.error || "Kunne ikke verifisere e-postadresse")
        return
      }

      setStatus("success")
      setMessage("E-postadressen din er nå verifisert! Du kan nå logge inn.")
      
      // Redirect til innlogging etter 3 sekunder
      setTimeout(() => {
        router.push("/auth/signin?verified=true")
      }, 3000)
    } catch (err) {
      setStatus("error")
      setMessage("Noe gikk galt ved verifisering. Prøv igjen senere.")
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navigation />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="inline-block mb-4">
                {status === "loading" && (
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                {status === "success" && (
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {status === "error" && (
                  <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {status === "loading" && "Verifiserer e-post..."}
                {status === "success" && "E-post verifisert!"}
                {status === "error" && "Verifisering feilet"}
              </h2>
              <p className="text-gray-600">{message}</p>
            </div>

            {status === "success" && (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Omdirigerer til innlogging...
                </p>
                <Link
                  href="/auth/signin?verified=true"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-all font-semibold"
                >
                  Gå til innlogging
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="text-center">
                <Link
                  href="/auth/signin"
                  className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all font-semibold mb-3"
                >
                  Gå til innlogging
                </Link>
                <p className="text-sm text-gray-500">
                  Hvis problemet vedvarer, kontakt oss på{" "}
                  <a href="mailto:support@parkshare.no" className="text-blue-600 hover:text-blue-700">
                    support@parkshare.no
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Laster...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

