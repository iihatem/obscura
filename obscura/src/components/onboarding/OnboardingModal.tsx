'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ANTHROPIC_LINKS } from '@/lib/apiKey'
import { dismissOnboarding, isOnboardingDismissed, restoreOnboarding } from '@/lib/onboarding'

interface Step {
  icon: string
  eyebrow: string
  title: string
  body: ReactNode
}

function Bullet({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="material-symbols-outlined text-[18px] text-[#006972] mt-0.5 shrink-0">
        {icon}
      </span>
      <span className="text-sm text-[#45474d] leading-relaxed">{children}</span>
    </li>
  )
}

function ExternalLink({ href, icon, label, hint }: { href: string; icon: string; label: string; hint: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-[#e7e8e9] bg-white px-4 py-3 hover:border-[#006972]/40 hover:bg-[#006972]/[0.03] transition-colors group"
    >
      <span className="material-symbols-outlined text-[20px] text-[#006972] shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#051125]">{label}</span>
        <span className="block text-xs text-[#75777d]">{hint}</span>
      </span>
      <span className="material-symbols-outlined text-[16px] text-[#75777d] group-hover:text-[#006972] transition-colors">
        open_in_new
      </span>
    </a>
  )
}

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
}

export default function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const router = useRouter()
  const ref = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(0)
  const [dontShow, setDontShow] = useState(false)

  const steps: Step[] = [
    {
      icon: 'auto_stories',
      eyebrow: 'Welcome',
      title: 'Obscura turns your slides into study sets',
      body: (
        <>
          <p className="text-sm text-[#45474d] leading-relaxed">
            Upload a lecture PDF or a diagram and Obscura writes the study material for you —
            flashcards for the concepts, labelled-diagram quizzes for the visuals.
          </p>
          <ul className="space-y-3">
            <Bullet icon="bolt">Three steps: create a set, add your material, study it.</Bullet>
            <Bullet icon="schedule">The whole tour takes about a minute.</Bullet>
          </ul>
        </>
      ),
    },
    {
      icon: 'library_add',
      eyebrow: 'Step 1',
      title: 'Create a set',
      body: (
        <>
          <p className="text-sm text-[#45474d] leading-relaxed">
            A set is one topic&apos;s worth of cards. Hit <strong className="text-[#051125]">New Set</strong> in
            the sidebar or on your Library, then give it a title.
          </p>
          <ul className="space-y-3">
            <Bullet icon="sell">Add a subject so it&apos;s easy to find later.</Bullet>
            <Bullet icon="visibility">
              Choose who sees it: <strong className="text-[#051125]">Private</strong> (just you),{' '}
              <strong className="text-[#051125]">Link only</strong>, or{' '}
              <strong className="text-[#051125]">Public</strong> — public sets show up in Explore.
            </Bullet>
          </ul>
        </>
      ),
    },
    {
      icon: 'cloud_upload',
      eyebrow: 'Step 2',
      title: 'Add your material',
      body: (
        <>
          <p className="text-sm text-[#45474d] leading-relaxed">
            Open a set and choose <strong className="text-[#051125]">Upload</strong>. Drop in a PDF, JPG,
            PNG or WebP — Obscura renders the pages so you can pick only the ones worth studying.
          </p>
          <ul className="space-y-3">
            <Bullet icon="auto_awesome">
              AI reads the pages you picked and drafts flashcards and diagram label cards.
            </Bullet>
            <Bullet icon="edit">
              Everything stays editable — rewrite a card, move a label, or add cards by hand.
            </Bullet>
          </ul>
        </>
      ),
    },
    {
      icon: 'school',
      eyebrow: 'Step 3',
      title: 'Study and track your score',
      body: (
        <>
          <p className="text-sm text-[#45474d] leading-relaxed">
            Hit <strong className="text-[#051125]">Study</strong> on a set and pick a mode:{' '}
            <strong className="text-[#051125]">Flashcards</strong>,{' '}
            <strong className="text-[#051125]">Diagrams</strong>, or{' '}
            <strong className="text-[#051125]">Mixed</strong>.
          </p>
          <ul className="space-y-3">
            <Bullet icon="replay">
              Every session is scored, and you can immediately retry just the cards you missed.
            </Bullet>
            <Bullet icon="insights">
              Your recent sessions and running stats live on your Profile.
            </Bullet>
          </ul>
        </>
      ),
    },
    {
      icon: 'key',
      eyebrow: 'Optional',
      title: 'Use your own Anthropic API key',
      body: (
        <>
          <p className="text-sm text-[#45474d] leading-relaxed">
            Everyone gets a free daily allowance of AI generations on our shared key. Add your own
            Anthropic key to skip that cap entirely — generations then bill to your account instead.
          </p>

          <div className="flex flex-col gap-2">
            <ExternalLink
              href={ANTHROPIC_LINKS.keys}
              icon="vpn_key"
              label="Create an API key"
              hint="console.anthropic.com → Settings → API keys"
            />
            <ExternalLink
              href={ANTHROPIC_LINKS.billing}
              icon="credit_card"
              label="Buy credits"
              hint="A key only works once its account has credit"
            />
            <ExternalLink
              href={ANTHROPIC_LINKS.pricing}
              icon="payments"
              label="See what it costs"
              hint="Anthropic's API pricing, per model"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose()
              router.push('/profile')
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg scholar-gradient px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            Paste your key in Profile
          </button>

          <p className="text-xs text-[#75777d] leading-relaxed">
            Keys start with <code className="font-mono">sk-ant-</code> and are stored only in this
            browser — they never reach our database, so you&apos;ll re-enter yours on other devices.
          </p>
        </>
      ),
    },
  ]

  const last = step === steps.length - 1
  const current = steps[step]

  // Reflect the stored preference, and always restart the tour from step 1.
  useEffect(() => {
    if (!open) return
    setStep(0)
    setDontShow(isOnboardingDismissed())
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function toggleDontShow(checked: boolean) {
    setDontShow(checked)
    if (checked) dismissOnboarding()
    else restoreOnboarding()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key === 'ArrowRight' && !last) setStep((s) => s + 1)
    if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
  }

  return (
    <dialog
      ref={ref}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      aria-labelledby="onboarding-title"
      className={cn(
        'fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-hidden',
        'rounded-xl border border-[#e7e8e9] bg-white p-0 shadow-2xl backdrop:bg-[#051125]/50'
      )}
    >
      <div className="flex max-h-[90vh] flex-col">
        {/* Gradient hairline, matching the set pages */}
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#051125] via-[#006972] to-[#051125]" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#006972]/10">
              <span className="material-symbols-outlined text-[22px] text-[#006972]">
                {current.icon}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#006972]">
                {current.eyebrow}
              </p>
              <h2
                id="onboarding-title"
                className="mt-1 text-xl font-extrabold tracking-tight text-[#051125]"
                style={{ fontFamily: 'var(--font-manrope)' }}
              >
                {current.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-[#75777d] hover:bg-[#f3f4f5] hover:text-[#051125] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-4">{current.body}</div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#e7e8e9] bg-[#f8f9f9] px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-[#45474d]">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => toggleDontShow(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[#006972]"
              />
              Don&apos;t show again
            </label>

            <div className="flex items-center gap-3">
              {/* Step dots */}
              <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
                {steps.map((s, i) => (
                  <span
                    key={s.eyebrow + s.title}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === step ? 'w-5 bg-[#006972]' : 'w-1.5 bg-[#c5c6cd]'
                    )}
                  />
                ))}
              </div>

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="h-9 rounded-lg border border-[#e7e8e9] bg-white px-4 text-xs font-bold text-[#45474d] hover:bg-[#f3f4f5] transition-colors"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => (last ? onClose() : setStep((s) => s + 1))}
                className="h-9 rounded-lg scholar-gradient px-5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
              >
                {last ? 'Start studying' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  )
}
