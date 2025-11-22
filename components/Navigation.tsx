"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import UnreadMessagesBadge from "./UnreadMessagesBadge"

export default function Navigation() {
  const { data: session } = useSession()
  const isUtleier = session?.user.userType === "UTLEIER"

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              href={session ? "/dashboard" : "/"} 
              className="flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Parkshare
              </span>
            </Link>
          </div>
          
          {session ? (
            <div className="flex items-center gap-4">
              {/* Navigation links based on user type */}
              {isUtleier ? (
                <>
                  <Link
                    href="/dashboard/parking-spots"
                    className="hidden sm:block px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Mine plasser
                  </Link>
                  <Link
                    href="/dashboard/bookings"
                    className="hidden sm:block px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Bookinger
                  </Link>
                  <Link
                    href="/dashboard/revenue"
                    className="hidden sm:block px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Inntekter
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard/search"
                    className="hidden sm:block px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Søk parkering
                  </Link>
                  <Link
                    href="/dashboard/bookings"
                    className="hidden sm:block px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Mine bookinger
                  </Link>
                </>
              )}
              
              {/* Messages badge */}
              <UnreadMessagesBadge />
              
              {/* User menu */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-xs text-gray-600">{session.user.email}</p>
                </div>
                <Link
                  href="/api/auth/signout"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Logg ut
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Logg inn
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-lg transition-all shadow-sm hover:shadow-md"
              >
                Registrer deg
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

