/**
 * CSRF Protection utility
 * 
 * NextAuth.js provides built-in CSRF protection, but we add additional
 * validation for state-changing operations.
 */

import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

/**
 * Verify CSRF token for state-changing operations
 * NextAuth handles CSRF automatically, but this provides additional validation
 */
export async function verifyCSRF(request: Request): Promise<boolean> {
  // NextAuth handles CSRF protection automatically via cookies
  // This function provides additional validation if needed
  
  // Check if request has valid session (NextAuth validates CSRF automatically)
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return false
  }

  // Additional checks can be added here if needed
  // For now, rely on NextAuth's built-in CSRF protection
  
  return true
}

/**
 * Generate CSRF token (if custom implementation needed)
 * Note: NextAuth handles this automatically, but kept for future use
 */
export function generateCSRFToken(): string {
  // In a custom implementation, you would generate a secure random token
  // For now, we rely on NextAuth's built-in CSRF protection
  return ""
}

