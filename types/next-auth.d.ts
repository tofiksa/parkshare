import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      userType: "UTLEIER" | "LEIETAKER"
    }
  }

  interface User {
    userType: "UTLEIER" | "LEIETAKER"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userType: "UTLEIER" | "LEIETAKER"
  }
}

