'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/utils/supabase/useUser'
import { useSanctuary } from '@/context/SanctuaryContext'
import { haptics } from '@/utils/haptics'

export default function SanctuaryLanding() {
  const router = useRouter()
  const { user, signInAnonymously } = useUser()
  const { setGender: setGlobalGender } = useSanctuary()

  const [gender, setGender] = useState<'man' | 'woman' | null>(null)
  const [ageConfirmed, setAgeConfirmed] = useState(true)
  const [isEntering, setIsEntering] = useState(false)

  const handleGenderToggle = (g: 'man' | 'woman') => {
    haptics.lightTap()
    setGender(g)
  }

  const handleEnter = async () => {
    if (!gender || !ageConfirmed) return
    setIsEntering(true)
    haptics.confirm()

    try {
      if (!user) {
        await signInAnonymously()
      }
      setGlobalGender(gender)
      sessionStorage.setItem('gender', gender)
      router.push('/interests')
    } catch {
      setIsEntering(false)
    }
  }

  return (
    <div className="relative min-h-dvh bg-[#0e0a07] text-[#f5ebe0] flex flex-col justify-between overflow-hidden select-none">
      {/* Background Ambient Glow & Warm Blur Vignette */}
      <div className="absolute -top-40 -left-40 w-[36rem] h-[36rem] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[36rem] h-[36rem] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="safe-top p-6 md:px-12 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
          <span className="font-serif italic text-lg sm:text-xl tracking-wider text-[#f5ebe0]">
            CHATAway
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs bg-[#160e0a]/80 backdrop-blur-md border border-amber-900/40 py-1.5 px-3.5 rounded-full text-[#a89582]">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Anonymous Sanctuary</span>
        </div>
      </header>

      {/* Main Sanctuary Compact Card [Q11, Q189] */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-amber-900/35 shadow-2xl shadow-black/80 animate-scale-in">
          {/* Headline */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-serif italic text-[#fef9f5] font-light">
              Leave the noise behind.
            </h1>
            <p className="text-xs sm:text-sm text-[#a89582] mt-1.5 font-light">
              Welcome to your private synchronized adult sanctuary.
            </p>
          </div>

          {/* The 3 Sanctuary Compact Pillars [Q189] */}
          <div className="space-y-3 mb-6 bg-[#120a06]/80 p-4 rounded-2xl border border-amber-900/25">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-amber-300 font-mono">
                I
              </span>
              <div>
                <h4 className="text-xs font-semibold text-[#f5ebe0]">Honor Mutual Consent</h4>
                <p className="text-[11px] text-[#a89582] mt-0.5">
                  Every video and quest is shared consensually. Safewords instantly pause the room.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-amber-300 font-mono">
                II
              </span>
              <div>
                <h4 className="text-xs font-semibold text-[#f5ebe0]">Cherish Anonymity</h4>
                <p className="text-[11px] text-[#a89582] mt-0.5">
                  No cameras, no microphones, zero profile logs. All sessions are 100% ephemeral.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-amber-300 font-mono">
                III
              </span>
              <div>
                <h4 className="text-xs font-semibold text-[#f5ebe0]">Leave with Kindness</h4>
                <p className="text-[11px] text-[#a89582] mt-0.5">
                  When you part, offer mutual respect. Aftercare wind-down lounges are always open.
                </p>
              </div>
            </div>
          </div>

          {/* Gender Selector [Q002] */}
          <div className="mb-6">
            <label className="block text-xs uppercase tracking-widest font-mono text-amber-400/90 mb-2.5 text-center">
              Select Your Identity
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGenderToggle('man')}
                className={`py-3.5 px-4 rounded-2xl border text-xs sm:text-sm font-semibold transition cursor-pointer btn-press flex flex-col items-center gap-1.5 ${
                  gender === 'man'
                    ? 'bg-gradient-to-tr from-amber-600/30 to-orange-600/20 border-amber-400 text-white shadow-lg shadow-amber-950/60 ring-1 ring-amber-400/50'
                    : 'bg-[#160e0a]/60 border-amber-900/30 text-[#a89582] hover:border-amber-700/50 hover:text-[#f5ebe0]'
                }`}
              >
                <span>I am a Man</span>
                <span className="text-[10px] font-mono font-normal opacity-70">Pairs with Women</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenderToggle('woman')}
                className={`py-3.5 px-4 rounded-2xl border text-xs sm:text-sm font-semibold transition cursor-pointer btn-press flex flex-col items-center gap-1.5 ${
                  gender === 'woman'
                    ? 'bg-gradient-to-tr from-amber-600/30 to-orange-600/20 border-amber-400 text-white shadow-lg shadow-amber-950/60 ring-1 ring-amber-400/50'
                    : 'bg-[#160e0a]/60 border-amber-900/30 text-[#a89582] hover:border-amber-700/50 hover:text-[#f5ebe0]'
                }`}
              >
                <span>I am a Woman</span>
                <span className="text-[10px] font-mono font-normal opacity-70">Pairs with Men</span>
              </button>
            </div>
          </div>

          {/* Age Confirmation Checkbox */}
          <div
            onClick={() => {
              haptics.lightTap()
              setAgeConfirmed(!ageConfirmed)
            }}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#120a06]/50 border border-amber-900/20 mb-6 cursor-pointer select-none"
          >
            <div
              className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                ageConfirmed
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'border-amber-900/50 bg-transparent'
              }`}
            >
              {ageConfirmed && <CheckIcon className="w-3 h-3" />}
            </div>
            <span className="text-[11px] text-[#a89582]">
              I confirm that I am at least 18 years old and consent to adult co-viewing.
            </span>
          </div>

          {/* Primary CTA Button [Q07] */}
          <Button
            variant="primary"
            size="lg"
            isLoading={isEntering}
            disabled={!gender || !ageConfirmed}
            onClick={handleEnter}
            className="w-full py-4 text-sm tracking-wide font-semibold shadow-xl shadow-amber-950/70"
          >
            Enter the Sanctuary →
          </Button>
        </div>
      </main>

      {/* Bottom Footer Discreet Notice */}
      <footer className="safe-bottom p-4 text-center text-[10px] text-[#a89582]/60 z-10 font-mono">
        100% Encrypted & Anonymous · 18 U.S.C. 2257 Compliant · Zero Storage
      </footer>
    </div>
  )
}