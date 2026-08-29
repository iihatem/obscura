/**
 * Whether the first-run walkthrough should still be shown.
 *
 * Deliberately a localStorage flag rather than a profile column: the tour is a
 * browser-level nicety, and a user on a new device usually *wants* to see it
 * again. Same storage caveats as the API key — private browsing can throw, so
 * every access is guarded and failure means "show the tour".
 */

const STORAGE_KEY = 'obscura.onboardingDismissed'

/** True only when the user explicitly chose "don't show again". */
export function isOnboardingDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // Private browsing / storage disabled — fall back to showing the tour.
    return false
  }
}

export function dismissOnboarding(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Undo a dismissal — used when the checkbox is unticked mid-tour. */
export function restoreOnboarding(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
