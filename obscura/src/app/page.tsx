import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Obscura</h1>
        <p className="text-gray-600 text-lg">
          Upload lecture slides. Get diagram occlusion cards and flashcards — instantly.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="px-5 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Get started
        </Link>
      </div>
      <Link href="/library" className="text-sm text-gray-400 hover:text-gray-600 underline">
        Go to library
      </Link>
    </main>
  )
}
