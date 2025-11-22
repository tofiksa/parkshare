import Link from "next/link"
import Navigation from "@/components/Navigation"
import { TERMS_VERSION, TERMS_LAST_UPDATED, TERMS_TEXT } from "@/lib/terms"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navigation />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Tilbake til forsiden
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Avtalevilkår</h1>
            <div className="text-sm text-gray-500">
              Versjon {TERMS_VERSION} - Sist oppdatert: {TERMS_LAST_UPDATED}
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line text-gray-700 leading-relaxed">
              {TERMS_TEXT}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Har du spørsmål om avtalevilkårene? Kontakt oss på{" "}
              <a href="mailto:support@parkshare.no" className="text-blue-600 hover:text-blue-700">
                support@parkshare.no
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

