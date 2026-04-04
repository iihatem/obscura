'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import type { Profile } from '@/types'

interface AppShellProps {
  profile: Profile | null
  children: React.ReactNode
}

export default function AppShell({ profile, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f4f5]">
      <Sidebar
        profile={profile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar profile={profile} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
