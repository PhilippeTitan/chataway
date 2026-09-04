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
  const [step, setStep] = useState<'age' | 'tos' | 'gender'>('age')
  const [gender, setGender] = useState<'man' | 'woman' | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleNextStep = (next: 'tos' | 'gender') => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStep(next)
      setIsTransitioning(false)
    }, 250)
  }

  // Ensure an anonymous session is provisioned once TOS is accepted
  const handleAcceptTos = async () => {
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
    <header className="absolute top-0 left-0 right-0 p-6 md:px-12 flex justify-between items-center z-20">
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
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            s === current
              ? 'w-8 bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              : s < current
              ? 'w-4 bg-amber-700/60'
              : 'w-4 bg-amber-950/40'
          }`}
        />
      ))}
    </div>
  )

  return (
    <div className="relative min-h-screen text-[#f5ebe0] flex flex-col items-center justify-center px-4 py-20 selection:bg-amber-800/40 selection:text-amber-200">
      <SunsetBackdrop />
      {renderTopBar()}

      <main className="relative z-10 w-full max-w-xl mx-auto">
        <div
          className={`transition-all duration-300 ease-out ${
            isTransitioning ? 'opacity-0 translate-y-3 scale-98' : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          {/* STEP 1: THE WELCOMING THRESHOLD (AGE VERIFICATION) */}
          {step === 'age' && (
            <div className="relative backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center">
              {renderStepIndicator(1)}

              <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400/90 mb-3">
                A Quiet Sunset Sanctuary
              </span>

              <h1 className="text-3xl md:text-4xl font-serif text-[#fef9f5] font-light tracking-wide mb-4 leading-snug">
                Welcome. Take a breath and settle in.
              </h1>

              <p className="text-[#c7b5a3] text-base md:text-lg leading-relaxed max-w-md mx-auto mb-10 font-light">
                CHATAway is a discreet, unhurried space for adults to converse, unwind, and share company without noise or judgment.
              </p>

              <div className="p-5 rounded-2xl bg-[#130c07]/60 border border-amber-900/25 mb-8 text-left flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <span className="font-serif italic font-semibold text-lg">18+</span>
                </div>
                <div>
                  <h2 className="text-sm font-medium text-[#f5ebe0] mb-1">
                    An adult-only environment
                  </h2>
                  <p className="text-xs text-[#a89582] leading-relaxed">
                    To preserve our privacy and community care, please confirm you are at least eighteen years of age.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
                <button
                  onClick={() => handleNextStep('tos')}
                  className="px-8 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-medium rounded-2xl transition-all duration-300 shadow-[0_8px_24px_-4px_rgba(234,88,12,0.4)] hover:shadow-[0_12px_32px_-4px_rgba(234,88,12,0.6)] cursor-pointer flex items-center justify-center gap-2.5 group"
                >
                  <CheckIcon className="w-5 h-5 text-amber-200 group-hover:scale-110 transition-transform" />
                  <span>Yes, I am 18 or older</span>
                </button>

                <button
                  onClick={() => (window.location.href = 'https://google.com')}
                  className="px-6 py-4 bg-[#231811]/80 hover:bg-[#2d2017] border border-amber-900/30 text-[#b5a290] hover:text-[#f5ebe0] rounded-2xl font-medium transition-all duration-200 cursor-pointer"
                >
                  No, take me back
                </button>
              </div>

              <p className="text-[11px] text-[#8c7867] mt-8 tracking-wider">
                Warm ocean air · Discretion guaranteed · No personal data requested
              </p>
            </div>
          )}

          {/* STEP 2: SANCTUARY PRINCIPLES & GUIDELINES (TOS) */}
          {step === 'tos' && (
            <div className="relative backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)]">
              {renderStepIndicator(2)}

              <div className="text-center mb-6">
                <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400/90 mb-2">
                  Sanctuary Etiquette
                </span>
                <h1 className="text-3xl font-serif text-[#fef9f5] font-light tracking-wide mb-2">
                  Mutual Respect & Discretion
                </h1>
                <p className="text-sm text-[#b5a290]">
                  By stepping inside, you contribute to a calm, trustworthy haven.
                </p>
              </div>

              <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                <div className="p-4 rounded-2xl bg-[#140d08]/70 border border-amber-900/25 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center shrink-0 text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-[#f5ebe0]">
                      Respect boundaries & full consent
                    </h2>
                    <p className="text-xs text-[#a89582] mt-0.5">
                      Kindness and consent guide every exchange. You are free to end or skip a conversation at any second.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#140d08]/70 border border-amber-900/25 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center shrink-0 text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-[#f5ebe0]">
                      Guard your private identity
                    </h2>
                    <p className="text-xs text-[#a89582] mt-0.5">
                      Never exchange telephone numbers, addresses, social handles, or financial accounts.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#140d08]/70 border border-amber-900/25 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center shrink-0 text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-[#f5ebe0]">
                      No bots, recording, or harassment
                    </h2>
                    <p className="text-xs text-[#a89582] mt-0.5">
                      Screen recording without consent and commercial spam lead to immediate, irreversible removal.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#140d08]/70 border border-amber-900/25 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center shrink-0 text-sm font-semibold">
                    4
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-[#f5ebe0]">
                      Discreet & ephemeral by design
                    </h2>
                    <p className="text-xs text-[#a89582] mt-0.5">
                      Your chat sessions expire when you leave. Nothing is permanently archived or shared.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAcceptTos}
                className="w-full py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-medium rounded-2xl transition-all duration-300 shadow-[0_8px_24px_-4px_rgba(234,88,12,0.4)] hover:shadow-[0_12px_32px_-4px_rgba(234,88,12,0.6)] cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-5 h-5 text-amber-200" />
                <span>I Agree & Step Inside</span>
              </button>
            </div>
          )}

          {/* STEP 3: IDENTITY & PRESENCE (GENDER SELECTION) */}
          {step === 'gender' && (
            <div className="relative backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center">
              {renderStepIndicator(3)}

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
                  className="group relative p-6 rounded-2xl bg-gradient-to-b from-[#241911]/90 to-[#19110b]/90 border border-amber-900/40 hover:border-amber-500/60 transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-[0_12px_30px_-6px_rgba(245,158,11,0.25)] text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-800/40 flex items-center justify-center mb-4 text-amber-400 group-hover:text-amber-300 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-serif text-[#fef9f5] font-normal mb-1">
                    As a Man
                  </h2>
                  <p className="text-xs text-[#a89582] group-hover:text-[#c7b5a3] transition-colors">
                    Looking to connect with women in an unhurried, comfortable setting.
                  </p>
                  <div className="mt-4 flex items-center text-xs font-medium text-amber-400/90 group-hover:text-amber-300">
                    <span>Continue as Man &rarr;</span>
                  </div>
                </button>

                {/* Woman Selection Card */}
                <button
                  onClick={() => handleGenderSelect('woman')}
                  className="group relative p-6 rounded-2xl bg-gradient-to-b from-[#261814]/90 to-[#1b100d]/90 border border-orange-900/40 hover:border-orange-500/60 transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-[0_12px_30px_-6px_rgba(234,88,12,0.25)] text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-950/70 border border-orange-800/40 flex items-center justify-center mb-4 text-orange-400 group-hover:text-orange-300 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-serif text-[#fef9f5] font-normal mb-1">
                    As a Woman
                  </h2>
                  <p className="text-xs text-[#a89582] group-hover:text-[#c7b5a3] transition-colors">
                    Looking to connect with men in an unhurried, comfortable setting.
                  </p>
                  <div className="mt-4 flex items-center text-xs font-medium text-orange-400/90 group-hover:text-orange-300">
                    <span>Continue as Woman &rarr;</span>
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