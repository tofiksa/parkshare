import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Add security headers
    const response = NextResponse.next()
    
    // HTTPS enforcement (in production)
    if (process.env.NODE_ENV === "production" && req.headers.get("x-forwarded-proto") !== "https") {
      return NextResponse.redirect(
        `https://${req.headers.get("host")}${req.nextUrl.pathname}`,
        301
      )
    }
    
    return response
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*"],
}

