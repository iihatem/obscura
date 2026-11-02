import Link from 'next/link'
import { buttonClass } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/frog.svg" alt="" className="h-7 w-7 rounded-md" />
          <span className="font-headline text-lg font-extrabold tracking-tight text-ink">Obscura</span>
        </Link>
      </header>
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
        <p className="font-headline text-6xl font-extrabold text-ink">404</p>
        <h1 className="mt-4 text-[22px] font-bold text-ink">This page doesn’t exist</h1>
        <p className="mt-2 text-ink-muted">
          The link may be old, or the set may have been made private or deleted by its owner.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/library" className={buttonClass('primary', 'md')}>Go to your library</Link>
          <Link href="/" className={buttonClass('secondary', 'md')}>Obscura home</Link>
        </div>
      </main>
    </div>
  )
}
