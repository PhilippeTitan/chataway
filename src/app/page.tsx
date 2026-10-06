'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SunsetBackdrop from '@/components/SunsetBackdrop'
import { CheckIcon, UserIcon } from '@/components/icons'
import { useUser } from '@/utils/supabase/useUser'

export default function Landing() {
  const router = useRouter()
  const { user, isAnonymous, signInAnonymously, signOut } = useUser()
  const [step, setStep] = useState<'welcome' | 'gender'>('welcome')
  const [gender, setGender] = useState<'man' | 'woman' | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleNextStep = (next: 'gender') => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStep(next)
      setIsTransitioning(false)
    }, 250)
  }

  // Ensure an anonymous session is provisioned once Compact is accepted
  const handleAcceptCompact = async () => {
    if (!user) {
      await signInAnonymously()
    }
    handleNextStep('gender')
  }

  const handleGenderSelect = (g: 'man' | 'woman') => {
    setGender(g)
    sessionStorage.setItem('gender', g)
    router.push('/interests')
  }

  const renderTopBar = () => (
    <header className="safe-top absolute top-0 left-0 right-0 p-6 md:px-12 flex justify-between items-center z-20">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
        <span className="font-serif italic text-lg tracking-wider text-[#f5ebe0]/90">
          CHATAway
        </span>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2 text-xs bg-[#221711]/70 backdrop-blur-md border border-amber-900/40 py-1.5 px-3.5 rounded-full text-[#d4c3b3]">
            <span
              className={`w-2 h-2 rounded-full ${
                isAnonymous ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span>{isAnonymous ? 'Anonymous Guest' : user.email}</span>
            {isAnonymous ? (
              <Link
                href="/login"
                className="ml-2 text-amber-300 hover:text-amber-200 font-medium underline underline-offset-2"
              >
                Sign In
              </Link>
            ) : (
              <button
                onClick={() => signOut()}
                className="ml-2 text-[#a89582] hover:text-[#f5ebe0] cursor-pointer transition"
              >
                Sign Out
              </button>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs bg-[#241a13]/70 hover:bg-[#32231a]/80 backdrop-blur-md border border-amber-800/30 py-1.5 px-4 rounded-full text-[#d4c3b3] hover:text-[#fef9f5] transition-all shadow-sm"
          >
            <UserIcon className="w-3.5 h-3.5 text-amber-400/80" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  )

  const renderStepIndicator = (current: number) => (
    <div className="flex items-center justify-center gap-3 mb-8">
      {[1, 2].map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            s === current
              ? 'w-10 bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              : 'w-4 bg-amber-950/50'
          }`}
        />
      ))}
    </div>
  )

  return (
    <div className="relative min-h-dvh text-[#f5ebe0] flex flex-col items-center justify-center px-4 py-20 safe-bottom selection:bg-amber-800/40 selection:text-amber-200">
      <SunsetBackdrop />
      {renderTopBar()}

      <main className="relative z-10 w-full max-w-xl mx-auto">
        <div
          className={`transition-all duration-300 ease-out ${
            isTransitioning ? 'opacity-0 translate-y-3 scale-98' : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          {/* STEP 1: CONSOLIDATED SANCTUARY THRESHOLD & COMPACT */}
          {step === 'welcome' && (
            <div className="relative backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center">
              {renderStepIndicator(1)}

              <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400/90 mb-3">
                A Quiet Sunset Sanctuary
              </span>

              {/* Atmospheric Header Visual */}
              <div className="relative w-full h-44 md:h-52 rounded-2xl overflow-hidden mb-6 border border-amber-900/40 shadow-inner group">
                <img 
                  src="/images/onboarding-welcome.jfif" 
                  alt="Tranquil Sunset Sanctuary" 
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-1000 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c130d] via-transparent to-black/30" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-[#f5ebe0]/90 font-serif italic">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Golden Hour Sanctuary
                  </span>
                  <span>Adults Only (18+)</span>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-serif text-[#fef9f5] font-light tracking-wide mb-3 leading-snug">
                Welcome. Take a breath and settle in.
              </h1>

              <p className="text-[#c7b5a3] text-sm md:text-base leading-relaxed max-w-md mx-auto mb-6 font-light">
                CHATAway is an unhurried haven for adults to connect, converse, and share company without noise or judgment.
              </p>

              {/* The Sanctuary Compact (3 Principles) */}
              <div className="space-y-2.5 mb-8 text-left">
                <div className="p-3.5 rounded-2xl bg-[#140d08]/75 border border-amber-900/30 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5">
                    1
                  </div>
                  <div>
                    <h2 className="text-xs md:text-sm font-medium text-[#f5ebe0]">
                      Kindness & Full Consent
                    </h2>
                    <p className="text-[11px] md:text-xs text-[#a89582] leading-relaxed">
                      You are always in complete control. Skip or leave any conversation instantly.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#140d08]/75 border border-amber-900/30 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5">
                    2
                  </div>
                  <div>
                    <h2 className="text-xs md:text-sm font-medium text-[#f5ebe0]">
                      Absolute Privacy & Discretion
                    </h2>
                    <p className="text-[11px] md:text-xs text-[#a89582] leading-relaxed">
                      Never share real names, addresses, contacts, or financial handles. Remain discreet.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#140d08]/75 border border-amber-900/30 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5">
                    3
                  </div>
                  <div>
                    <h2 className="text-xs md:text-sm font-medium text-[#f5ebe0]">
                      Ephemeral Sessions & Clean Exits
                    </h2>
                    <p className="text-[11px] md:text-xs text-[#a89582] leading-relaxed">
                      Chats vanish when you depart. No recording, no permanent tracking or archives.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
                <button
                  onClick={handleAcceptCompact}
                  className="px-8 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-medium rounded-2xl transition-all duration-300 shadow-[0_8px_24px_-4px_rgba(234,88,12,0.4)] hover:shadow-[0_12px_32px_-4px_rgba(234,88,12,0.6)] cursor-pointer flex items-center justify-center gap-2.5 group"
                >
                  <CheckIcon className="w-5 h-5 text-amber-200 group-hover:scale-110 transition-transform" />
                  <span>I am 18+ and Accept the Compact</span>
                </button>

                <button
                  onClick={() => (window.location.href = 'https://google.com')}
                  className="px-6 py-4 bg-[#231811]/80 hover:bg-[#2d2017] border border-amber-900/30 text-[#b5a290] hover:text-[#f5ebe0] rounded-2xl font-medium transition-all duration-200 cursor-pointer"
                >
                  Decline
                </button>
              </div>

              <p className="text-[11px] text-[#8c7867] mt-8 tracking-wider">
                Warm ocean air · Discretion guaranteed · No personal data requested
              </p>
            </div>
          )}

          {/* STEP 2: IDENTITY & PRESENCE (GENDER SELECTION) */}
          {step === 'gender' && (
            <div className="relative backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center">
              {renderStepIndicator(2)}

              <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400/90 mb-3">
                Your Presence
              </span>

              <h1 className="text-3xl md:text-4xl font-serif text-[#fef9f5] font-light tracking-wide mb-3">
                How would you like to enter?
              </h1>

              <p className="text-[#c7b5a3] text-sm md:text-base leading-relaxed max-w-md mx-auto mb-8 font-light">
                Select your identity so we can match you with someone who shares your pace and warmth.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Man Selection Card */}
                <button
                  onClick={() => handleGenderSelect('man')}
                  className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#241911]/90 to-[#19110b]/90 border border-amber-900/40 hover:border-amber-500/60 transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-[0_16px_36px_-6px_rgba(245,158,11,0.3)] text-left flex flex-col"
                >
                  <div className="relative w-full h-44 overflow-hidden">
                    <img 
                      src="/images/presence-man.jpg" 
                      alt="Man at sunset" 
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#19110b] via-[#19110b]/40 to-transparent" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="text-xl font-serif text-[#fef9f5] font-normal mb-1">
                        As a Man
                      </h2>
                      <p className="text-xs text-[#a89582] group-hover:text-[#c7b5a3] transition-colors leading-relaxed">
                        Looking to connect with women in an unhurried, comfortable setting.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-amber-400/90 group-hover:text-amber-300">
                      <span>Continue as Man &rarr;</span>
                    </div>
                  </div>
                </button>

                {/* Woman Selection Card */}
                <button
                  onClick={() => handleGenderSelect('woman')}
                  className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#261814]/90 to-[#1b100d]/90 border border-orange-900/40 hover:border-orange-500/60 transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-[0_16px_36px_-6px_rgba(234,88,12,0.3)] text-left flex flex-col"
                >
                  <div className="relative w-full h-44 overflow-hidden">
                    <img 
                      src="/images/presence-woman.jpg" 
                      alt="Woman at sunset" 
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1b100d] via-[#1b100d]/40 to-transparent" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="text-xl font-serif text-[#fef9f5] font-normal mb-1">
                        As a Woman
                      </h2>
                      <p className="text-xs text-[#a89582] group-hover:text-[#c7b5a3] transition-colors leading-relaxed">
                        Looking to connect with men in an unhurried, comfortable setting.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-orange-400/90 group-hover:text-orange-300">
                      <span>Continue as Woman &rarr;</span>
                    </div>
                  </div>
                </button>
              </div>

              <p className="text-xs text-[#8c7867]">
                You can change this anytime from your preferences.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}