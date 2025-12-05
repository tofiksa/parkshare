"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface UserProfile {
  id: string
  email: string
  name: string
  phone: string | null
  userType: "UTLEIER" | "LEIETAKER"
  emailVerified: Date | null
  createdAt: string
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (session) {
      fetchProfile()
    }
  }, [session])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (!response.ok) {
        throw new Error("Kunne ikke hente profil")
      }
      const data = await response.json()
      setProfile(data)
      setFormData({
        name: data.name,
        phone: data.phone || "",
      })
    } catch (err) {
      setError("Kunne ikke laste profil")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke oppdatere profil")
      }

      setProfile(data)
      setIsEditing(false)
      setSuccess("Profil oppdatert!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oppdatere profil")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Passordene matcher ikke")
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError("Nytt passord må være minst 8 tegn")
      return
    }

    setSaving(true)

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke endre passord")
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setShowChangePassword(false)
      setSuccess("Passord endret!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke endre passord")
    } finally {
      setSaving(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ingen tilgang</h1>
          <Link href="/auth/signin" className="text-blue-600 hover:underline">
            Logg inn
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Laster profil...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                Parkshare
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Tilbake til dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Min profil</h1>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4 mb-4">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {profile && (
            <div className="space-y-6">
              {/* Profilinformasjon */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Profilinformasjon</h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Rediger
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Navn
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Telefonnummer
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                        placeholder="+47 123 45 678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-post
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100 text-gray-900"
                      />
                      <p className="text-xs text-gray-600 mt-1">E-post kan ikke endres</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Brukertype
                      </label>
                      <input
                        type="text"
                        value={profile.userType === "UTLEIER" ? "Utleier" : "Leietaker"}
                        disabled
                        className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100 text-gray-900"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "Lagrer..." : "Lagre"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false)
                          setFormData({
                            name: profile.name,
                            phone: profile.phone || "",
                          })
                          setError("")
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                      >
                        Avbryt
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Navn</p>
                      <p className="text-gray-900">{profile.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">E-post</p>
                      <p className="text-gray-900">{profile.email}</p>
                    </div>
                    {profile.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Telefonnummer</p>
                        <p className="text-gray-900">{profile.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700">Brukertype</p>
                      <p className="text-gray-900">
                        {profile.userType === "UTLEIER" ? "Utleier" : "Leietaker"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Medlem siden</p>
                      <p className="text-gray-900">
                        {new Date(profile.createdAt).toLocaleDateString("no-NO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Endre passord */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Passord</h2>
                  {!showChangePassword && (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Endre passord
                    </button>
                  )}
                </div>

                {showChangePassword && (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Nåværende passord
                      </label>
                      <input
                        id="currentPassword"
                        type="password"
                        required
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Nytt passord
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        required
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                        placeholder="Minst 8 tegn"
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Bekreft nytt passord
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        required
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "Endrer..." : "Endre passord"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePassword(false)
                          setPasswordData({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          })
                          setError("")
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                      >
                        Avbryt
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

