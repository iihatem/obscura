import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="bg-[#E6E6E2] text-[#1E2528] min-h-screen">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-[#E6E6E2]/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-8 h-16 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/frog.svg" alt="Obscura logo" className="w-8 h-8 rounded-md" />
            <div className="text-2xl font-black text-[#2A3741] tracking-tighter" style={{ fontFamily: 'var(--font-manrope)' }}>
              Obscura
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/library" className="text-[#4A5558] hover:text-[#2A3741] font-medium transition-colors">
              Dashboard
            </Link>
            <Link href="/library" className="text-[#4A5558] hover:text-[#2A3741] font-medium transition-colors">
              Library
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[#4A5558] hover:text-[#2A3741] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="scholar-gradient text-[#E6E6E2] px-5 py-2 rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#E6E6E2] py-24 px-8 lg:py-32">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-left">
              <span
                className="inline-block px-3 py-1 text-[#60888A] text-xs font-bold tracking-[0.05em] uppercase rounded-full mb-6 border border-[#60888A]/20 bg-[#60888A]/8"
              >
                Introducing The Digital Curator
              </span>
              <h1
                className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-8 text-[#2A3741]"
                style={{ fontFamily: 'var(--font-manrope)' }}
              >
                Your Lecture Slides,{' '}
                <br />
                <span className="bg-gradient-to-r from-[#2A3741] to-[#60888A] bg-clip-text text-transparent">
                  Automatically Transformed
                </span>
                <br />
                into Quizzes
              </h1>
              <p className="text-[#4A5558] text-lg lg:text-xl leading-relaxed max-w-xl mb-10">
                Stop highlighting and start recalling. Obscura uses advanced AI to curate your
                study materials into interactive mastery paths.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="scholar-gradient text-[#E6E6E2] px-8 py-4 rounded-lg font-bold text-lg hover:opacity-90 hover:shadow-xl transition-all active:scale-95 text-center"
                >
                  Try it for Free
                </Link>
                <Link
                  href="/library"
                  className="border border-[#BABAB6] text-[#2A3741] px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#D8D8D4] transition-all text-center"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              <div className="relative z-10 bg-white p-4 rounded-xl shadow-2xl border border-[#BABAB6]/20">
                {/* Dashboard preview mockup */}
                <div className="rounded-lg bg-[#EAEAE6] p-6 space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-[#CFCFCB]">
                    <div className="w-3 h-3 rounded-full bg-[#60888A]" />
                    <span className="text-xs font-bold text-[#2A3741] uppercase tracking-widest" style={{ fontFamily: 'var(--font-manrope)' }}>AI Processing Complete</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['Anatomy 101', 'Cell Biology', 'Neuroplasticity'].map((title, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-[#D8D8D4]">
                        <div className="h-12 rounded bg-[#E1E1DD] mb-2" />
                        <p className="text-xs font-semibold text-[#2A3741] line-clamp-1" style={{ fontFamily: 'var(--font-manrope)' }}>{title}</p>
                        <p className="text-[10px] text-[#60888A] font-bold mt-1">24 cards</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#D8D8D4]">
                    <span className="material-symbols-outlined text-[#60888A] text-lg">auto_awesome</span>
                    <div>
                      <p className="text-xs font-bold text-[#2A3741]">AI Curator Insight</p>
                      <p className="text-[10px] text-[#4A5558]">3 new cards generated from Chapter 5</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#60888A]/10 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#2A3741]/5 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </section>

        {/* ── Bento Grid Features ───────────────────────────────────────── */}
        <section className="bg-[#DDDDD9] py-24 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#2A3741] mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
                Everything you need to master any subject
              </h2>
              <p className="text-[#4A5558] max-w-xl mx-auto">
                From upload to mastery in minutes. Obscura handles the hard work so you can focus on learning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Feature 1: Upload */}
              <div className="md:col-span-8 bg-white p-10 rounded-xl flex flex-col justify-between group hover:shadow-lg transition-shadow border border-[#D8D8D4]">
                <div>
                  <div className="w-12 h-12 bg-[#2A3741]/5 rounded-lg flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[#2A3741]">upload_file</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#2A3741] mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
                    Upload PDFs or Slides
                  </h3>
                  <p className="text-[#4A5558] max-w-md">
                    Our engine parses complex medical diagrams, law case summaries, and engineering
                    slides with surgical precision.
                  </p>
                </div>
                <div className="mt-12 bg-[#E1E1DD] rounded-lg p-6 border border-[#CFCFCB]">
                  <div className="flex items-center gap-4 text-sm text-[#6A7A7C] font-medium">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                    <span>Cellular_Biology_Lecture_04.pdf</span>
                    <span className="ml-auto text-[#60888A] font-bold">Complete</span>
                  </div>
                </div>
              </div>

              {/* Feature 2: Diagram Drills */}
              <div className="md:col-span-4 scholar-gradient p-10 rounded-xl text-[#E6E6E2]">
                <span className="material-symbols-outlined text-4xl mb-6 block">psychology</span>
                <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
                  AI-Generated Diagram Drills
                </h3>
                <p className="opacity-90 leading-relaxed mb-8">
                  Recall labels dynamically. Obscura hides key parts of your diagrams and tests your
                  spatial memory.
                </p>
                <div className="relative h-32 bg-white/10 rounded-lg overflow-hidden backdrop-blur-sm flex items-center justify-center">
                  <div className="bg-white/20 px-4 py-2 rounded-md border border-white/30 backdrop-blur-md text-sm font-medium">
                    Label this part?
                  </div>
                </div>
              </div>

              {/* Feature 3: Flashcards */}
              <div className="md:col-span-5 bg-white p-10 rounded-xl border border-[#D8D8D4]">
                <div className="flex items-center gap-4 mb-6">
                  <span className="material-symbols-outlined text-[#60888A]">style</span>
                  <h3 className="text-xl font-bold text-[#2A3741]" style={{ fontFamily: 'var(--font-manrope)' }}>
                    Flashcard-Style Q&amp;A
                  </h3>
                </div>
                <p className="text-[#4A5558] mb-10">
                  Spaced repetition built-in. We generate thousands of atomic cards from your notes
                  automatically.
                </p>
                <div className="space-y-3">
                  <div className="bg-[#E6E6E2] p-4 rounded-lg border-l-4 border-[#60888A] text-sm font-medium text-[#1E2528]">
                    Q: What is the main function of ATP?
                  </div>
                  <div className="bg-[#E1E1DD] p-4 rounded-lg text-sm text-[#6A7A7C] italic">
                    Click to reveal answer...
                  </div>
                </div>
              </div>

              {/* Feature 4: Cohort */}
              <div className="md:col-span-7 bg-[#3A4E5A] p-10 rounded-xl text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
                    Collaborative Sharing with Your Cohort
                  </h3>
                  <p className="text-[#A8BEC0] max-w-sm mb-12">
                    Host live study sessions or share curated quiz banks with your fellow students instantly.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {['JD', 'SK', 'AM'].map((init) => (
                        <div key={init} className="w-10 h-10 rounded-full bg-[#60888A] border-2 border-[#3A4E5A] flex items-center justify-center text-xs font-bold text-white">
                          {init}
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full bg-[#60888A] border-2 border-[#3A4E5A] flex items-center justify-center text-xs font-bold">
                        +24
                      </div>
                    </div>
                    <span className="text-[#8A9FA0] text-sm ml-2">students studying now</span>
                  </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10">
                  <span className="material-symbols-outlined" style={{ fontSize: '12rem' }}>group</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Scholar Insight ────────────────────────────────────────── */}
        <section className="py-24 px-8 bg-[#E6E6E2]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#2A3741] mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
                The Focus Fragment
              </h2>
              <p className="text-[#4A5558]">Experience our signature AI summarization interface</p>
            </div>
            <div className="bg-white rounded-xl p-12 border border-[#BABAB6]/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2A3741] via-[#60888A] to-[#2A3741]" />
              <div className="flex items-start gap-6 mb-8">
                <div className="p-3 bg-[#60888A]/10 rounded-lg">
                  <span className="material-symbols-outlined text-[#60888A]">auto_awesome</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#2A3741] mb-1" style={{ fontFamily: 'var(--font-manrope)' }}>
                    AI Scholar Insight
                  </h4>
                  <p className="text-sm text-[#4A5558]">Synthesized from Chapter 5: Neuroplasticity</p>
                </div>
              </div>
              <p className="text-lg leading-relaxed text-[#1E2528] mb-6">
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
                    <span className="material-symbols-outlined text-[#60888A] mt-1">check_circle</span>
                    <span className="text-[#4A5558] font-medium italic">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-24 px-8 bg-[#2A3741]">
          <div className="max-w-7xl mx-auto text-center">
            <h2
              className="text-[#E6E6E2] text-4xl lg:text-6xl font-black mb-8 tracking-tighter"
              style={{ fontFamily: 'var(--font-manrope)' }}
            >
              Ready to revolutionize your revision?
            </h2>
            <p className="text-[#8A9FA0] text-xl mb-12 max-w-2xl mx-auto">
              Join over 50,000 students using Obscura to master their courses in half the time.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                href="/signup"
                className="bg-[#B8D0D1] text-[#2A3741] px-10 py-5 rounded-lg font-black text-xl hover:bg-[#60888A] hover:text-white transition-all"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="bg-[#3A4E5A] text-[#E6E6E2] px-10 py-5 rounded-lg font-bold text-xl border border-white/10 hover:bg-white/5 transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-[#D8D8D4] py-16 px-8 border-t border-[#BABAB6]/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/frog.svg" alt="Obscura logo" className="w-7 h-7 rounded-md" />
              <div className="text-2xl font-black text-[#2A3741] tracking-tighter" style={{ fontFamily: 'var(--font-manrope)' }}>
                Obscura
              </div>
            </div>
            <p className="text-sm text-[#4A5558] leading-relaxed">
              The Digital Curator for the next generation of scholars. Engineering focus through
              AI-driven pedagogy.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-[#2A3741] mb-6 uppercase tracking-widest text-xs">Product</h5>
            <ul className="space-y-4 text-sm text-[#4A5558]">
              <li><Link href="#" className="hover:text-[#60888A] transition-colors">Quiz Generation</Link></li>
              <li><Link href="#" className="hover:text-[#60888A] transition-colors">AI Diagrams</Link></li>
              <li><Link href="#" className="hover:text-[#60888A] transition-colors">Study Analytics</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#2A3741] mb-6 uppercase tracking-widest text-xs">Community</h5>
            <ul className="space-y-4 text-sm text-[#4A5558]">
              <li><Link href="#" className="hover:text-[#60888A] transition-colors">Student Discord</Link></li>
              <li><Link href="#" className="hover:text-[#60888A] transition-colors">Scholar Blog</Link></li>
              <li><Link href="#" className="hover:text-[#60888A] transition-colors">Affiliate Program</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#2A3741] mb-6 uppercase tracking-widest text-xs">Legal</h5>
            <ul className="space-y-4 text-sm text-[#4A5558]">
              <li><Link href="#" className="hover:text-[#60888A] transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-[#60888A] transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-[#60888A] transition-colors">AI Ethics</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#BABAB6]/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#6A7A7C]">© 2024 Obscura. All rights reserved. Built for curious minds.</p>
        </div>
      </footer>
    </div>
  )
}
