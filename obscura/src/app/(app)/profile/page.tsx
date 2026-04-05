'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'

interface ProfileData {
  id: string
  display_name: string | null
  avatar_url: string | null
  email: string
  sets_count: number
  cards_studied: number
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-[#e7e8e9] p-6 flex flex-col gap-3">
      <span className="material-symbols-outlined text-[28px] text-[#006972]">{icon}</span>
      <div>
        <p className="text-3xl font-extrabold text-[#051125]" style={{ fontFamily: 'var(--font-manrope)' }}>
          {value}
        </p>
        <p className="text-xs font-bold uppercase tracking-widest text-[#75777d] mt-1">{label}</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/profile')
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data)
        setDisplayName(data.display_name ?? '')
      })
      .catch(() => toast('Failed to load profile', 'error'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    try {
      const res = await apiFetch('/profile', {
        method: 'PATCH',
        body: JSON.stringify({ display_name: displayName }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      const updated = await res.json()
      setProfile((p) => p ? { ...p, display_name: updated.display_name } : p)
      setEditing(false)
      toast('Profile updated')
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const initials = (profile?.display_name ?? profile?.email ?? '?')
    .slice(0, 2)
    .toUpperCase()

  if (loading) {
    return (
      <div className="p-8 lg:p-12 space-y-10 max-w-2xl">
        <div className="flex items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="p-8 lg:p-12 space-y-10 max-w-2xl">
      {/* Header */}
      <section className="space-y-2">
        <h2
          className="text-4xl font-extrabold tracking-tight text-[#051125]"
          style={{ fontFamily: 'var(--font-manrope)' }}
        >
          Profile
        </h2>
        <p className="text-[#45474d]">Manage your account and view your study stats.</p>
      </section>

      {/* Identity card */}
      <div className="bg-white rounded-xl border border-[#e7e8e9] p-6 flex items-start gap-5">
        {/* Avatar */}
        <div className="h-16 w-16 rounded-full scholar-gradient flex items-center justify-center shrink-0">
          <span className="text-xl font-black text-white" style={{ fontFamily: 'var(--font-manrope)' }}>
            {initials}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-[#45474d]">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                  className="w-full max-w-xs rounded-lg bg-[#f3f4f5] border-none px-3 py-2 text-sm text-[#191c1d] placeholder:text-[#75777d] focus:outline-none focus:ring-2 focus:ring-[#006972]/20"
                  placeholder="Your name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') { setEditing(false); setDisplayName(profile.display_name ?? '') }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-8 px-4 rounded-lg scholar-gradient text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setDisplayName(profile.display_name ?? '') }}
                  className="h-8 px-4 rounded-lg border border-[#e7e8e9] text-xs font-bold text-[#45474d] hover:bg-[#f3f4f5] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p
                  className="text-lg font-extrabold text-[#051125]"
                  style={{ fontFamily: 'var(--font-manrope)' }}
                >
                  {profile.display_name || <span className="text-[#75777d] font-medium italic">No display name</span>}
                </p>
                <p className="text-sm text-[#75777d] mt-0.5">{profile.email}</p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e7e8e9] bg-white px-3 text-xs font-bold text-[#051125] hover:bg-[#edeeef] transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#45474d]">Study stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon="layers" label="Sets created" value={profile.sets_count} />
          <StatCard icon="school" label="Cards studied" value={profile.cards_studied} />
        </div>
      </section>
    </div>
  )
}
