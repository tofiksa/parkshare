import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-post og passord er påkrevd")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          throw new Error("Ugyldig e-post eller passord")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("Ugyldig e-post eller passord")
        }

        // Check if email is verified (only in production, allow unverified in development)
        if (process.env.NODE_ENV === "production" && !user.emailVerified) {
          throw new Error("E-postadressen din er ikke verifisert. Sjekk din e-post for verifiseringslink.")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.userType as "UTLEIER" | "LEIETAKER",
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // When user logs in, set userType from user object
      if (user) {
        token.userType = user.userType as "UTLEIER" | "LEIETAKER"
      }
      // Ensure userType is preserved in token
      // If userType is missing (shouldn't happen, but safety check), fetch from database
      if (!token.userType && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { userType: true }
        })
        if (dbUser) {
          token.userType = dbUser.userType as "UTLEIER" | "LEIETAKER"
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        // Always set userType from token, with fallback to database if missing
        if (token.userType && (token.userType === "UTLEIER" || token.userType === "LEIETAKER")) {
          session.user.userType = token.userType
        } else if (token.sub) {
          // Fallback: fetch from database if token.userType is missing or invalid
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { userType: true }
          })
          if (dbUser) {
            session.user.userType = dbUser.userType
          }
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET,
}

