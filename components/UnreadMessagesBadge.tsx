"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

export default function UnreadMessagesBadge() {
  const { data: session } = useSession()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    if (!session) return

    try {
      const response = await fetch("/api/messages/unread")
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      // Silently fail - don't spam console with errors for polling
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching unread messages:", error)
      }
    }
  }, [session])

  useEffect(() => {
    if (!session) return

    fetchUnreadCount()
    // Poll every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000)
    return () => clearInterval(interval)
  }, [session, fetchUnreadCount])

  if (unreadCount === 0) return null

  return (
    <Link
      href="/dashboard/bookings"
      className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
    >
      <span>Meldinger</span>
      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    </Link>
  )
}

