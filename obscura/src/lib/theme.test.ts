import { afterEach, describe, expect, it } from 'vitest'
import { applyTheme, parseTheme } from './theme'

describe('parseTheme', () => {
  it('keeps an explicit choice', () => {
    expect(parseTheme('light')).toBe('light')
    expect(parseTheme('dark')).toBe('dark')
  })

  it('falls back to the device for anything else', () => {
    expect(parseTheme(undefined)).toBe('system')
    expect(parseTheme('')).toBe('system')
    expect(parseTheme('DARK')).toBe('system')
    expect(parseTheme('<script>')).toBe('system')
  })
})

describe('applyTheme', () => {
  afterEach(() => applyTheme('system'))

  it('sets the attribute and cookie for an explicit choice', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.cookie).toContain('theme=dark')
  })

  it('clears both for system', () => {
    applyTheme('light')
    applyTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(document.cookie).not.toContain('theme=light')
  })
})
