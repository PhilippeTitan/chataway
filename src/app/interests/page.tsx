'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SunsetBackdrop from '@/components/SunsetBackdrop'
import { SearchIcon, PlayIcon } from '@/components/icons'

const allInterests = [
  'Amateur', 'Anal', 'Asian', 'BBW', 'Big Ass', 'Big Tits', 'Blonde', 'Blowjob',
  'Brunette', 'Creampie', 'Cowgirl', 'Deepthroat', 'Doggy', 'Facial', 'Hentai',
  'Interracial', 'Lesbian', 'Masturbation', 'MILF', 'Orgasm', 'POV', 'Public',
  'Redhead', 'Rough', 'Solo', 'Squirting', 'Teen', 'Threesome', 'Titty Fuck',
  'Webcam', 'Young'
]

export default function Interests() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (interest: string) => {
    setSelected(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : prev.length < 15 
          ? [...prev, interest]
          : prev
    )
  }

  const handleEnterMatchmaking = () => {
    sessionStorage.setItem('interests', JSON.stringify(selected))
    router.push('/queue')
  }

  const handleEnterSolo = () => {
    sessionStorage.setItem('interests', JSON.stringify(selected))
    router.push('/solo')
  }

  const handleSkipTo = (destination: '/queue' | '/solo') => {
    sessionStorage.setItem('interests', '[]')
    router.push(destination)
  }

  return (
    <div className="relative min-h-dvh text-[#f5ebe0] flex flex-col items-center justify-center p-6 safe-top safe-bottom selection:bg-amber-800/40 selection:text-amber-200">
      <SunsetBackdrop />

      <main className="relative z-10 w-full max-w-3xl mx-auto backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-1.5 rounded-full w-4 bg-amber-700/60" />
          <div className="h-1.5 rounded-full w-10 bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
        </div>

        <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400/90 mb-3">
          Step 2 · Desires & Moods
        </span>

        {/* Visual Banner */}
        <div className="relative w-full h-36 md:h-44 rounded-2xl overflow-hidden mb-6 border border-amber-900/40 shadow-inner group">
          <img 
            src="/images/onboarding-interests.jfif" 
            alt="Warm Atmospheric Sanctuary" 
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c130d] via-transparent to-black/30" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-[#f5ebe0]/90 font-serif italic">
            <span>Curate Your Atmosphere</span>
            <span>Personalized Experience</span>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-serif text-[#fef9f5] font-light tracking-wide mb-3">
          What draws your attention today?
        </h1>

        <p className="text-[#c7b5a3] text-sm md:text-base leading-relaxed max-w-lg mx-auto mb-6 font-light">
          Choose a few themes that match your curiosity. We use these gently to pair you with someone who shares your pace, or to curate your Solo feed.
        </p>
        
        <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl mx-auto mb-6 stagger-children">
          {allInterests.map(interest => {
            const isSelected = selected.includes(interest)
            return (
              <button
                key={interest}
                onClick={() => toggle(interest)}
                className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer animate-scale-in btn-press ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white border border-amber-400/40 shadow-[0_4px_16px_rgba(234,88,12,0.35)] scale-105'
                    : 'bg-[#251a13]/80 text-[#c7b5a3] hover:text-[#fef9f5] border border-amber-900/30 hover:border-amber-700/50 hover:bg-[#302219]'
                }`}
              >
                {interest}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-amber-500/70" />
          <p className="text-xs text-[#a89582] tracking-wider uppercase font-medium">
            {selected.length} of 15 selected
          </p>
        </div>

        {/* Dual Primary Action Lounge Paths */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6 max-w-xl mx-auto">
          <button 
            onClick={handleEnterMatchmaking}
            className="px-6 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-medium text-sm rounded-2xl transition-all duration-300 shadow-[0_8px_24px_-4px_rgba(234,88,12,0.4)] hover:shadow-[0_12px_32px_-4px_rgba(234,88,12,0.6)] cursor-pointer flex items-center justify-center gap-2 btn-press"
          >
            <SearchIcon className="w-4 h-4 text-amber-200" />
            <span>Enter Matchmaking Lounge</span>
          </button>

          <button 
            onClick={handleEnterSolo}
            className="px-6 py-4 bg-[#261b14] hover:bg-[#32231a] border border-amber-900/40 hover:border-amber-700/60 text-[#f5ebe0] font-medium text-sm rounded-2xl transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2 btn-press"
          >
            <PlayIcon className="w-4 h-4 text-amber-400" />
            <span>Unwind in Solo Lounge</span>
          </button>
        </div>

        {/* Discreet Skip Options */}
        <div className="flex items-center justify-center gap-4 text-xs text-[#8c7867]">
          <button 
            onClick={() => handleSkipTo('/queue')}
            className="hover:text-[#d4c3b3] underline underline-offset-4 cursor-pointer transition"
          >
            Skip to Matchmaking
          </button>
          <span>·</span>
          <button 
            onClick={() => handleSkipTo('/solo')}
            className="hover:text-[#d4c3b3] underline underline-offset-4 cursor-pointer transition"
          >
            Skip to Solo Lounge
          </button>
        </div>
      </main>
    </div>
  )
}