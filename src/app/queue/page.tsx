'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SunsetBackdrop from '@/components/SunsetBackdrop'
import { VideoIcon, CloseIcon } from '@/components/icons'

export default function Queue() {
  const router = useRouter()
  const [dots, setDots] = useState('')
  const [time, setTime] = useState(0)

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)

    const timeInterval = setInterval(() => {
      setTime(prev => prev + 1)
    }, 1000)

    const matchTimeout = setTimeout(() => {
      router.push('/chat')
    }, 3500 + Math.random() * 4500)

    return () => {
      clearInterval(dotInterval)
      clearInterval(timeInterval)
      clearTimeout(matchTimeout)
    }
  }, [router])

  const gender = typeof window !== 'undefined' ? sessionStorage.getItem('gender') : 'man'

  return (
    <div className="relative min-h-screen text-[#f5ebe0] flex flex-col items-center justify-center p-6 selection:bg-amber-800/40 selection:text-amber-200">
      <SunsetBackdrop />

      <main className="relative z-10 w-full max-w-md mx-auto backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center">
        {/* Animated Sunset Breathing Orb */}
        <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
          {/* Outer Ripple */}
          <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping opacity-30 duration-1000" />
          {/* Middle Pulse */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-amber-600/30 to-orange-500/20 blur-md animate-pulse" />
          {/* Inner Glowing Sun */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.6)] flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#1a110a] animate-spin"
              style={{ animationDuration: '8s' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </div>

        <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400/90 mb-2">
          Matchmaking Sanctuary
        </span>

        <h1 className="text-2xl md:text-3xl font-serif text-[#fef9f5] font-light tracking-wide mb-2">
          Connecting on your wavelength{dots}
        </h1>

        <p className="text-sm text-[#b5a290] leading-relaxed mb-6 font-light">
          {gender === 'man'
            ? 'Pairing you with a woman seeking mindful company...'
            : 'Pairing you with a man seeking mindful company...'}
        </p>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#130c07]/60 border border-amber-900/30 text-xs text-[#a89582] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Waiting in lounge · {time}s</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push('/solo')}
            className="px-5 py-3 bg-[#261b14]/80 hover:bg-[#32231a] border border-amber-900/35 text-[#d4c3b3] hover:text-[#fef9f5] rounded-xl font-medium text-xs md:text-sm transition cursor-pointer flex items-center justify-center gap-2"
          >
            <VideoIcon className="w-4 h-4 text-amber-400/80" />
            <span>Watch Solo In Lounge</span>
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="px-5 py-3 bg-[#1e130d]/80 hover:bg-[#281911] border border-amber-950 text-[#8c7867] hover:text-[#b5a290] rounded-xl font-medium text-xs md:text-sm transition cursor-pointer flex items-center justify-center gap-2"
          >
            <CloseIcon className="w-4 h-4" />
            <span>Cancel & Leave</span>
          </button>
        </div>
      </main>
    </div>
  )
}