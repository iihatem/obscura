import Link from 'next/link'
import Icon from '@/components/ui/Icon'

export default function HomePage() {
  return (
    <div className="bg-paper-2 text-ink min-h-screen">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-paper-2/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-8 h-16 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/frog.svg" alt="Obscura logo" className="w-8 h-8 rounded-md" />
            <div className="font-headline text-2xl font-black text-ink tracking-tighter">
              Obscura
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/library" className="text-ink-muted hover:text-ink font-medium transition-colors">
              Dashboard
            </Link>
            <Link href="/library" className="text-ink-muted hover:text-ink font-medium transition-colors">
              Library
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-ink-muted hover:text-ink transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-ink text-paper-2 px-5 py-2 rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-paper-2 py-24 px-8 lg:py-32">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-left">
              <span
                className="inline-block px-3 py-1 text-accent text-xs font-bold tracking-[0.05em] uppercase rounded-full mb-6 border border-accent/20 bg-accent/8"
              >
                Introducing The Digital Curator
              </span>
              <h1
                className="font-headline text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-8 text-ink"
              >
                Your Lecture Slides,{' '}
                <br />
                <span className="bg-gradient-to-r from-ink to-accent bg-clip-text text-transparent">
                  Automatically Transformed
                </span>
                <br />
                into Quizzes
              </h1>
              <p className="text-ink-muted text-lg lg:text-xl leading-relaxed max-w-xl mb-10">
                Stop highlighting and start recalling. Obscura uses advanced AI to curate your
                study materials into interactive mastery paths.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="bg-ink text-paper-2 px-8 py-4 rounded-lg font-bold text-lg hover:opacity-90 hover:shadow-xl transition-all active:scale-95 text-center"
                >
                  Try it for Free
                </Link>
                <Link
                  href="/library"
                  className="border border-line text-ink px-8 py-4 rounded-lg font-bold text-lg hover:bg-line transition-all text-center"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              <div className="relative z-10 bg-surface p-4 rounded-xl shadow-2xl border border-line/20">
                {/* Dashboard preview mockup */}
                <div className="rounded-lg bg-paper-2 p-6 space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-line">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <span className="font-headline text-xs font-bold text-ink uppercase tracking-widest">AI Processing Complete</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['Anatomy 101', 'Cell Biology', 'Neuroplasticity'].map((title, i) => (
                      <div key={i} className="bg-surface rounded-lg p-3 shadow-sm border border-line">
                        <div className="h-12 rounded bg-paper-2 mb-2" />
                        <p className="font-headline text-xs font-semibold text-ink line-clamp-1">{title}</p>
                        <p className="text-[10px] text-accent font-bold mt-1">24 cards</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-surface rounded-lg border border-line">
                    <Icon name="auto_awesome" size={18} className="text-accent" />
                    <div>
                      <p className="text-xs font-bold text-ink">AI Curator Insight</p>
                      <p className="text-[10px] text-ink-muted">3 new cards generated from Chapter 5</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-ink/5 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </section>

        {/* ── Bento Grid Features ───────────────────────────────────────── */}
        <section className="bg-line py-24 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl lg:text-4xl font-bold text-ink mb-4">
                Everything you need to master any subject
              </h2>
              <p className="text-ink-muted max-w-xl mx-auto">
                From upload to mastery in minutes. Obscura handles the hard work so you can focus on learning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Feature 1: Upload */}
              <div className="md:col-span-8 bg-surface p-10 rounded-xl flex flex-col justify-between group hover:shadow-lg transition-shadow border border-line">
                <div>
                  <div className="w-12 h-12 bg-ink/5 rounded-lg flex items-center justify-center mb-6">
                    <Icon name="upload_file" size={20} className="text-ink" />
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-ink mb-4">
                    Upload PDFs or Slides
                  </h3>
                  <p className="text-ink-muted max-w-md">
                    Our engine parses complex medical diagrams, law case summaries, and engineering
                    slides with surgical precision.
                  </p>
                </div>
                <div className="mt-12 bg-paper-2 rounded-lg p-6 border border-line">
                  <div className="flex items-center gap-4 text-sm text-ink-muted font-medium">
                    <Icon name="picture_as_pdf" size={20} />
                    <span>Cellular_Biology_Lecture_04.pdf</span>
                    <span className="ml-auto text-accent font-bold">Complete</span>
                  </div>
                </div>
              </div>

              {/* Feature 2: Diagram Drills */}
              <div className="md:col-span-4 bg-ink p-10 rounded-xl text-paper-2">
                <Icon name="psychology" size={36} className="mb-6 block" />
                <h3 className="font-headline text-2xl font-bold mb-4">
                  AI-Generated Diagram Drills
                </h3>
                <p className="opacity-90 leading-relaxed mb-8">
                  Recall labels dynamically. Obscura hides key parts of your diagrams and tests your
                  spatial memory.
                </p>
                <div className="relative h-32 bg-surface/10 rounded-lg overflow-hidden backdrop-blur-sm flex items-center justify-center">
                  <div className="bg-surface/20 px-4 py-2 rounded-md border border-surface/30 backdrop-blur-md text-sm font-medium">
                    Label this part?
                  </div>
                </div>
              </div>

              {/* Feature 3: Flashcards */}
              <div className="md:col-span-5 bg-surface p-10 rounded-xl border border-line">
                <div className="flex items-center gap-4 mb-6">
                  <Icon name="style" size={20} className="text-accent" />
                  <h3 className="font-headline text-xl font-bold text-ink">
                    Flashcard-Style Q&amp;A
                  </h3>
                </div>
                <p className="text-ink-muted mb-10">
                  Spaced repetition built-in. We generate thousands of atomic cards from your notes
                  automatically.
                </p>
                <div className="space-y-3">
                  <div className="bg-paper-2 p-4 rounded-lg border-l-4 border-accent text-sm font-medium text-ink">
                    Q: What is the main function of ATP?
                  </div>
                  <div className="bg-paper-2 p-4 rounded-lg text-sm text-ink-muted italic">
                    Click to reveal answer...
                  </div>
                </div>
              </div>

              {/* Feature 4: Cohort */}
              <div className="md:col-span-7 bg-ink/90 p-10 rounded-xl text-on-ink relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="font-headline text-2xl font-bold mb-4">
                    Collaborative Sharing with Your Cohort
                  </h3>
                  <p className="text-accent-soft max-w-sm mb-12">
                    Host live study sessions or share curated quiz banks with your fellow students instantly.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {['JD', 'SK', 'AM'].map((init) => (
                        <div key={init} className="w-10 h-10 rounded-full bg-accent border-2 border-ink/90 flex items-center justify-center text-xs font-bold text-on-ink">
                          {init}
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full bg-accent border-2 border-ink/90 flex items-center justify-center text-xs font-bold">
                        +24
                      </div>
                    </div>
                    <span className="text-ink-muted text-sm ml-2">students studying now</span>
                  </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10">
                  <Icon name="group" size={192} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Scholar Insight ────────────────────────────────────────── */}
        <section className="py-24 px-8 bg-paper-2">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl lg:text-4xl font-bold text-ink mb-4">
                The Focus Fragment
              </h2>
              <p className="text-ink-muted">Experience our signature AI summarization interface</p>
            </div>
            <div className="bg-surface rounded-xl p-12 border border-line/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ink via-accent to-ink" />
              <div className="flex items-start gap-6 mb-8">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Icon name="auto_awesome" size={20} className="text-accent" />
                </div>
                <div>
                  <h4 className="font-headline text-lg font-bold text-ink mb-1">
                    AI Scholar Insight
                  </h4>
                  <p className="text-sm text-ink-muted">Synthesized from Chapter 5: Neuroplasticity</p>
                </div>
              </div>
              <p className="text-lg leading-relaxed text-ink mb-6">
                Neuroplasticity refers to the brain&apos;s ability to reorganize itself by forming new
                neural connections throughout life. This process allows the neurons in the brain to
                compensate for injury and disease and to adjust their activities in response to new
                situations or changes in their environment.
              </p>
              <ul className="space-y-4">
                {[
                  'Key Quiz Trigger: Synaptic Pruning vs. Long-Term Potentiation',
                  'High Probability Exam Topic: The Role of Myelination',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Icon name="check_circle" size={20} className="text-accent mt-1" />
                    <span className="text-ink-muted font-medium italic">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-24 px-8 bg-ink">
          <div className="max-w-7xl mx-auto text-center">
            <h2
              className="font-headline text-paper-2 text-4xl lg:text-6xl font-black mb-8 tracking-tighter"
            >
              Ready to revolutionize your revision?
            </h2>
            <p className="text-ink-muted text-xl mb-12 max-w-2xl mx-auto">
              Join over 50,000 students using Obscura to master their courses in half the time.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                href="/signup"
                className="bg-accent-soft text-ink px-10 py-5 rounded-lg font-black text-xl hover:bg-accent hover:text-on-ink transition-all"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="bg-ink/90 text-paper-2 px-10 py-5 rounded-lg font-bold text-xl border border-surface/10 hover:bg-surface/5 transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-line py-16 px-8 border-t border-line/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/frog.svg" alt="Obscura logo" className="w-7 h-7 rounded-md" />
              <div className="font-headline text-2xl font-black text-ink tracking-tighter">
                Obscura
              </div>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              The Digital Curator for the next generation of scholars. Engineering focus through
              AI-driven pedagogy.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-ink mb-6 uppercase tracking-widest text-xs">Product</h5>
            <ul className="space-y-4 text-sm text-ink-muted">
              <li><Link href="#" className="hover:text-accent transition-colors">Quiz Generation</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">AI Diagrams</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Study Analytics</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-ink mb-6 uppercase tracking-widest text-xs">Community</h5>
            <ul className="space-y-4 text-sm text-ink-muted">
              <li><Link href="#" className="hover:text-accent transition-colors">Student Discord</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Scholar Blog</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Affiliate Program</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-ink mb-6 uppercase tracking-widest text-xs">Legal</h5>
            <ul className="space-y-4 text-sm text-ink-muted">
              <li><Link href="#" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">AI Ethics</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-line/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-ink-muted">© 2024 Obscura. All rights reserved. Built for curious minds.</p>
        </div>
      </footer>
    </div>
  )
}
