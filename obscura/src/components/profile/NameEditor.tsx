'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

const MAX = 80

export default function NameEditor({ userId, name }: { userId: string; name: string | null }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const trimmed = value.trim()
    if (trimmed.length > MAX) { setError(`Keep it under ${MAX} characters.`); return }
    setSaving(true)
    setError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase SDK generic inference
    const { error: err } = await (createClient().from('profiles') as any).update({ display_name: trimmed || null }).eq('id', userId)
    setSaving(false)
    if (err) { setError("Couldn't save your name. Please try again."); return }
    setOpen(false)
    toast('Name updated')
    router.refresh()
  }

  return (
    <>
      <IconButton label="Change your name" size="sm" onClick={() => { setValue(name ?? ''); setError(''); setOpen(true) }}>
        <Pencil className="h-4 w-4" aria-hidden />
      </IconButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Your name" description="Shown on sets you make public.">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save() }}>
          <Input label="Name" value={value} maxLength={MAX} onChange={(e) => setValue(e.target.value)} error={error || undefined} autoFocus />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
