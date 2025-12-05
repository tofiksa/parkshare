"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  read: boolean
  createdAt: string
  sender: {
    id: string
    name: string
    email: string
  }
  receiver: {
    id: string
    name: string
    email: string
  }
}

interface MessageThreadProps {
  bookingId: string
}

export default function MessageThread({ bookingId }: MessageThreadProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!bookingId) return

    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`)
      if (!response.ok) {
        throw new Error("Kunne ikke hente meldinger")
      }
      const data = await response.json()
      setMessages(data)
      setError("")
    } catch (err) {
      console.error("Error fetching messages:", err)
      if (loading) {
        setError("Kunne ikke laste meldinger")
      }
    } finally {
      setLoading(false)
    }
  }, [bookingId, loading])

  useEffect(() => {
    if (bookingId) {
      fetchMessages()
      // Poll for new messages every 5 seconds
      const interval = setInterval(fetchMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [bookingId, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    setError("")

    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newMessage.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Kunne ikke sende melding")
      }

      const message = await response.json()
      setMessages([...messages, message])
      setNewMessage("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke sende melding")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Meldinger</h3>
        <p className="text-gray-600">Laster meldinger...</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Meldinger</h3>
      </div>

      {/* Messages list */}
      <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <p>Ingen meldinger ennå. Start samtalen!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === session?.user.id
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-medium mb-1 opacity-75">
                      {message.sender.name}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? "text-blue-100" : "text-gray-600"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString("no-NO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Skriv en melding..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sender..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  )
}

