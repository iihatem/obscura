export type Theme = 'system' | 'light' | 'dark'

export const THEME_COOKIE = 'theme'

/** Anything but an explicit light or dark choice means "follow the device". */
export function parseTheme(value: string | undefined | null): Theme {
  return value === 'light' || value === 'dark' ? value : 'system'
}

/**
 * Remember the choice for a year and apply it now. The root layout reads the
 * cookie on the server, so the next page load renders in this theme with no flash.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    root.removeAttribute('data-theme')
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
  } else {
    root.setAttribute('data-theme', theme)
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`
  }
}
