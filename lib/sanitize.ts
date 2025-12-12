/**
 * Input sanitization utility for XSS protection
 * 
 * Removes HTML tags and dangerous characters from user input
 */

/**
 * Sanitize string input by removing HTML tags and dangerous characters
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input)
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  
  // Escape dangerous characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

  return sanitized.trim()
}

/**
 * Sanitize text content for display (allows some formatting)
 * @param input - String to sanitize
 * @returns Sanitized string with basic formatting preserved
 */
export function sanitizeTextContent(input: string): string {
  if (typeof input !== 'string') {
    return String(input)
  }

  // Remove script tags and dangerous attributes
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol

  // Escape remaining HTML but preserve line breaks
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  return sanitized.trim()
}

/**
 * Validate and sanitize message content
 * @param content - Message content to sanitize
 * @param maxLength - Maximum length (default: 5000)
 * @returns Sanitized content
 */
export function sanitizeMessageContent(content: string, maxLength: number = 5000): string {
  if (typeof content !== 'string') {
    throw new Error('Content must be a string')
  }

  if (content.length > maxLength) {
    throw new Error(`Content exceeds maximum length of ${maxLength} characters`)
  }

  return sanitizeString(content)
}

