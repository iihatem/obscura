import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] min-h-screen">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-8 h-16 w-full max-w-7xl mx-auto">
          <div className="text-2xl font-black text-[#051125] tracking-tighter" style={{ fontFamily: 'var(--font-manrope)' }}>
            Obscura
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/library" className="text-[#45474d] hover:text-[#051125] font-medium transition-colors">
              Dashboard
            </Link>
            <Link href="/library" className="text-[#45474d] hover:text-[#051125] font-medium transition-colors">
              Library
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[#45474d] hover:text-[#051125] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="scholar-gradient text-white px-5 py-2 rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#f8f9fa] py-24 px-8 lg:py-32">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-left">
              <span
                className="inline-block px-3 py-1 text-[#006972] text-xs font-bold tracking-[0.05em] uppercase rounded-full mb-6 border border-[#006972]/20 bg-[#006972]/5"
              >
                Introducing The Digital Curator
              </span>
              <h1
                className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-8 text-[#051125]"
                style={{ fontFamily: 'var(--font-manrope)' }}
              >
                Your Lecture Slides,{' '}
                <br />
                <span className="bg-gradient-to-r from-[#051125] to-[#006972] bg-clip-text text-transparent">
                  Automatically Transformed
                </span>
                <br />
                into Quizzes
              </h1>
              <p className="text-[#45474d] text-lg lg:text-xl leading-relaxed max-w-xl mb-10">
                Stop highlighting and start recalling. Obscura uses advanced AI to curate your
                study materials into interactive mastery paths.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="scholar-gradient text-white px-8 py-4 rounded-lg font-bold text-lg hover:opacity-90 hover:shadow-xl transition-all active:scale-95 text-center"
                >
                  Try it for Free
                </Link>
                <Link
                  href="/library"
                  className="border border-[#c5c6cd] text-[#051125] px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#f3f4f5] transition-all text-center"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              <div className="relative z-10 bg-white p-4 rounded-xl shadow-2xl border border-[#c5c6cd]/20">
                {/* Dashboard preview mockup */}
                <div className="rounded-lg bg-[#f3f4f5] p-6 space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-[#e1e3e4]">
                    <div className="w-3 h-3 rounded-full bg-[#006972]" />
                    <span className="text-xs font-bold text-[#051125] uppercase tracking-widest" style={{ fontFamily: 'var(--font-manrope)' }}>AI Processing Complete</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['Anatomy 101', 'Cell Biology', 'Neuroplasticity'].map((title, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-[#e7e8e9]">
                        <div className="h-12 rounded bg-[#edeeef] mb-2" />
                        <p className="text-xs font-semibold text-[#051125] line-clamp-1" style={{ fontFamily: 'var(--font-manrope)' }}>{title}</p>
                        <p className="text-[10px] text-[#006972] font-bold mt-1">24 cards</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#e7e8e9]">
                    <span className="material-symbols-outlined text-[#006972] text-lg">auto_awesome</span>
                    <div>
                      <p className="text-xs font-bold text-[#051125]">AI Curator Insight</p>
                      <p className="text-[10px] text-[#45474d]">3 new cards generated from Chapter 5</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#006972]/10 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#051125]/5 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </section>

        {/* ── Bento Grid Features ───────────────────────────────────────── */}
        <section className="bg-[#f3f4f5] py-24 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#051125] mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
                Everything you need to master any subject
              </h2>
              <p className="text-[#45474d] max-w-xl mx-auto">
                From upload to mastery in minutes. Obscura handles the hard work so you can focus on learning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Feature 1: Upload */}
              <div className="md:col-span-8 bg-white p-10 rounded-xl flex flex-col justify-between group hover:shadow-lg transition-shadow border border-[#e7e8e9]">
                <div>
                  <div className="w-12 h-12 bg-[#051125]/5 rounded-lg flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[#051125]">upload_file</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#051125] mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
                    Upload PDFs or Slides
                  </h3>
                  <p className="text-[#45474d] max-w-md">
                    Our engine parses complex medical diagrams, law case summaries, and engineering
                    slides with surgical precision.
                  </p>
                </div>
                <div className="mt-12 bg-[#edeeef] rounded-lg p-6 border border-[#e1e3e4]">
                  <div className="flex items-center gap-4 text-sm text-[#878d9c] font-medium">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                    <span>Cellular_Biology_Lecture_04.pdf</span>
                    <span className="ml-auto text-[#006972] font-bold">Complete</span>
                  </div>
                </div>
              </div>

              {/* Feature 2: Diagram Drills */}
              <div className="md:col-span-4 scholar-gradient p-10 rounded-xl text-white">
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
              <div className="md:col-span-5 bg-white p-10 rounded-xl border border-[#e7e8e9]">
                <div className="flex items-center gap-4 mb-6">
                  <span className="material-symbols-outlined text-[#006972]">style</span>
                  <h3 className="text-xl font-bold text-[#051125]" style={{ fontFamily: 'var(--font-manrope)' }}>
                    Flashcard-Style Q&amp;A
                  </h3>
                </div>
                <p className="text-[#45474d] mb-10">
                  Spaced repetition built-in. We generate thousands of atomic cards from your notes
                  automatically.
                </p>
                <div className="space-y-3">
                  <div className="bg-[#f8f9fa] p-4 rounded-lg border-l-4 border-[#006972] text-sm font-medium text-[#191c1d]">
                    Q: What is the main function of ATP?
                  </div>
                  <div className="bg-[#edeeef] p-4 rounded-lg text-sm text-[#75777d] italic">
                    Click to reveal answer...
                  </div>
                </div>
              </div>

              {/* Feature 4: Cohort */}
              <div className="md:col-span-7 bg-[#1b263b] p-10 rounded-xl text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
                    Collaborative Sharing with Your Cohort
                  </h3>
                  <p className="text-slate-300 max-w-sm mb-12">
                    Host live study sessions or share curated quiz banks with your fellow students instantly.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {['JD', 'SK', 'AM'].map((init) => (
                        <div key={init} className="w-10 h-10 rounded-full bg-[#006972] border-2 border-[#1b263b] flex items-center justify-center text-xs font-bold text-white">
                          {init}
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full bg-[#006972] border-2 border-[#1b263b] flex items-center justify-center text-xs font-bold">
                        +24
                      </div>
                    </div>
                    <span className="text-slate-400 text-sm ml-2">students studying now</span>
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
        <section className="py-24 px-8 bg-[#f8f9fa]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#051125] mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
                The Focus Fragment
              </h2>
              <p className="text-[#45474d]">Experience our signature AI summarization interface</p>
            </div>
            <div className="bg-white rounded-xl p-12 border border-[#c5c6cd]/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#051125] via-[#006972] to-[#051125]" />
              <div className="flex items-start gap-6 mb-8">
                <div className="p-3 bg-[#006972]/10 rounded-lg">
                  <span className="material-symbols-outlined text-[#006972]">auto_awesome</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#051125] mb-1" style={{ fontFamily: 'var(--font-manrope)' }}>
                    AI Scholar Insight
                  </h4>
                  <p className="text-sm text-[#45474d]">Synthesized from Chapter 5: Neuroplasticity</p>
                </div>
              </div>
              <p className="text-lg leading-relaxed text-[#191c1d] mb-6">
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
                    <span className="material-symbols-outlined text-[#006972] mt-1">check_circle</span>
                    <span className="text-[#45474d] font-medium italic">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-24 px-8 bg-[#051125]">
          <div className="max-w-7xl mx-auto text-center">
            <h2
              className="text-white text-4xl lg:text-6xl font-black mb-8 tracking-tighter"
              style={{ fontFamily: 'var(--font-manrope)' }}
            >
              Ready to revolutionize your revision?
            </h2>
            <p className="text-[#828da7] text-xl mb-12 max-w-2xl mx-auto">
              Join over 50,000 students using Obscura to master their courses in half the time.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                href="/signup"
                className="bg-[#9ff0fb] text-[#066f79] px-10 py-5 rounded-lg font-black text-xl hover:bg-[#006972] hover:text-white transition-all"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="bg-[#1b263b] text-white px-10 py-5 rounded-lg font-bold text-xl border border-white/10 hover:bg-white/5 transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-[#e7e8e9] py-16 px-8 border-t border-[#c5c6cd]/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1">
            <div className="text-2xl font-black text-[#051125] tracking-tighter mb-6" style={{ fontFamily: 'var(--font-manrope)' }}>
              Obscura
            </div>
            <p className="text-sm text-[#45474d] leading-relaxed">
              The Digital Curator for the next generation of scholars. Engineering focus through
              AI-driven pedagogy.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-[#051125] mb-6 uppercase tracking-widest text-xs">Product</h5>
            <ul className="space-y-4 text-sm text-[#45474d]">
              <li><Link href="#" className="hover:text-[#006972] transition-colors">Quiz Generation</Link></li>
              <li><Link href="#" className="hover:text-[#006972] transition-colors">AI Diagrams</Link></li>
              <li><Link href="#" className="hover:text-[#006972] transition-colors">Study Analytics</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#051125] mb-6 uppercase tracking-widest text-xs">Community</h5>
            <ul className="space-y-4 text-sm text-[#45474d]">
              <li><Link href="#" className="hover:text-[#006972] transition-colors">Student Discord</Link></li>
              <li><Link href="#" className="hover:text-[#006972] transition-colors">Scholar Blog</Link></li>
              <li><Link href="#" className="hover:text-[#006972] transition-colors">Affiliate Program</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#051125] mb-6 uppercase tracking-widest text-xs">Legal</h5>
            <ul className="space-y-4 text-sm text-[#45474d]">
              <li><Link href="#" className="hover:text-[#006972] transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-[#006972] transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-[#006972] transition-colors">AI Ethics</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#c5c6cd]/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#878d9c]">© 2024 Obscura AI. All rights reserved. Built for curious minds.</p>
        </div>
      </footer>
    </div>
  )
}
