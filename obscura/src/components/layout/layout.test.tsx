import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { isActive } from './PillNav'
import { isFocusRoute } from './AppShell'
import { initialsOf } from '@/lib/utils'

vi.mock('next/navigation', () => ({ usePathname: () => '/explore', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

describe('isActive', () => {
  it('matches the page and its children, not lookalikes', () => {
    expect(isActive('/library', '/library')).toBe(true)
    expect(isActive('/library/x', '/library')).toBe(true)
    expect(isActive('/library-old', '/library')).toBe(false)
  })
})

describe('isFocusRoute', () => {
  it('hides the shell only in study sessions and practice tests', () => {
    expect(isFocusRoute('/sets/abc/study')).toBe(true)
    expect(isFocusRoute('/sets/abc/study/')).toBe(true)
    expect(isFocusRoute('/sets/abc/test')).toBe(true)
    expect(isFocusRoute('/sets/abc')).toBe(false)
    expect(isFocusRoute('/sets/study-guide')).toBe(false)
    expect(isFocusRoute('/sets/test')).toBe(false)
  })
})

describe('initialsOf', () => {
  it('handles empty, one and many names', () => {
    expect(initialsOf(null)).toBe('?')
    expect(initialsOf('  ')).toBe('?')
    expect(initialsOf('hatem')).toBe('HA')
    expect(initialsOf('Hatem El Mougy')).toBe('HM')
  })
})

describe('PillNav', () => {
  it('marks the current page', async () => {
    const { default: PillNav } = await import('./PillNav')
    render(<PillNav hidden={false} />)
    expect(screen.getByRole('link', { name: 'Explore' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Library' }).getAttribute('aria-current')).toBeNull()
  })
})
