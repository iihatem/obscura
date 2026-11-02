'use client'

import { useState, useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { applyTheme, parseTheme, THEME_COOKIE, type Theme } from '@/lib/theme'

const noop = () => () => {}
const readCookie = () => parseTheme(document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`))?.[1])

export default function ThemePicker() {
  // The server can't see the cookie's effect on this page, so it renders
  // "System" and the browser corrects it after hydration.
  const saved = useSyncExternalStore(noop, readCookie, () => 'system' as Theme)
  const [picked, setPicked] = useState<Theme | null>(null)

  return (
    <SegmentedControl
      label="Theme"
      value={picked ?? saved}
      onChange={(t) => { setPicked(t); applyTheme(t) }}
      options={[
        { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" aria-hidden /> },
        { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" aria-hidden /> },
        { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" aria-hidden /> },
      ]}
    />
  )
}
