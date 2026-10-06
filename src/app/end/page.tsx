'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StarIcon, CheckIcon, HomeIcon, SearchIcon, HeartIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { haptics } from '@/utils/haptics'
import { useToast } from '@/components/ui/Toast'

const GRATITUDE_PILLS = [
  'Electric Chemistry',
  'Deeply Respectful',
  'Elite Taste',
  'Warm & Attentive',
]

export default function AfterglowLounge() {
  const router = useRouter()
  const { toast } = useToast()
  const [rating, setRating] = useState<number | null>(null)
  const [selectedPills, setSelectedPills] = useState<string[]>([])
  const [sessionSaved, setSessionSaved] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleStarClick = (score: number) => {
    haptics.confirm()
    setRating(score)
  }

  const togglePill = (pill: string) => {
    haptics.lightTap()
    setSelectedPills((prev) =>
      prev.includes(pill) ? prev.filter((p) => p !== pill) : [...prev, pill]
    )
  }

  const handleSaveWatchlist = () => {
    haptics.confirm()
    setSessionSaved(true)
    toast({
      title: 'Watchlist Saved to Vault',
      description: 'Your co-viewed scenes are safe on this device',
      variant: 'success',
    })
  }

  const handleReturnHome = () => {
    setIsExiting(true)
    haptics.lightTap()
    setTimeout(() => {
      router.push('/')
    }, 400)
  }

  return (
    <div className="relative min-h-dvh bg-[#0e0a07] text-[#f5ebe0] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none selection:bg-amber-700/30 selection:text-amber-200">
      {/* Background Afterglow Ambient Glow [Q117] */}
      <div className="absolute inset-0 bg-gradient-to-t from-amber-950/20 via-orange-950/10 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />

      {/* Main Afterglow Sanctuary Card [Q19] */}
      <main className="relative z-10 w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-amber-900/35 shadow-2xl shadow-black/90 text-center animate-scale-in">
        {/* Soft Glowing Emblem */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-950/60">
          <HeartIcon className="w-7 h-7 text-white" />
        </div>

        <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-mono text-amber-400/90 mb-1.5">
          The Afterglow Lounge
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif italic text-[#fef9f5]">
          A moment of stillness.
        </h1>
        <p className="text-xs sm:text-sm text-[#a89582] mt-1.5 font-light mb-6">
          Thank you for sharing your presence in the sanctuary.
        </p>

        {/* 5 Glowing Ember Rating Stars [Q19] */}
        <div className="mb-6 p-4 rounded-2xl bg-[#120a06]/80 border border-amber-900/25">
          <p className="text-xs text-[#a89582] mb-3 font-mono">How was your companion's vibe?</p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                className={`p-2 rounded-xl transition cursor-pointer btn-press ${
                  rating && rating >= star
                    ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-110'
                    : 'text-[#5c4a3b] hover:text-amber-300'
                }`}
              >
                <StarIcon className="w-7 h-7" filled={Boolean(rating && rating >= star)} />
              </button>
            ))}
          </div>
        </div>

        {/* Gratitude & Affirmation Pills [Q125, Q151] */}
        <div className="mb-6">
          <p className="text-xs text-[#a89582] mb-2.5 font-mono">Exchange Parting Gratitude</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {GRATITUDE_PILLS.map((pill) => {
              const isSelected = selectedPills.includes(pill)
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={() => togglePill(pill)}
                  className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer btn-press border ${
                    isSelected
                      ? 'bg-amber-600/30 border-amber-400 text-amber-200 ring-1 ring-amber-400/40'
                      : 'bg-[#160e0a] border-amber-900/30 text-[#a89582] hover:text-[#f5ebe0]'
                  }`}
                >
                  {pill}
                </button>
              )
            })}
          </div>
        </div>

        {/* 1-Tap Save Watchlist to Vault [Q130] */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveWatchlist}
            disabled={sessionSaved}
            leftIcon={<HeartIcon className="w-4 h-4 text-amber-400" />}
            className="w-full text-xs text-amber-300 hover:text-amber-100"
          >
            {sessionSaved ? '✓ Co-Viewed Scenes Saved in Vault' : 'Save Session Videos to My Vault'}
          </Button>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push('/queue')}
            leftIcon={<SearchIcon className="w-4 h-4" />}
            className="flex-1 text-xs sm:text-sm font-semibold"
          >
            Find New Match
          </Button>

          <Button
            variant="secondary"
            size="md"
            isLoading={isExiting}
            onClick={handleReturnHome}
            leftIcon={<HomeIcon className="w-4 h-4 text-amber-400" />}
            className="flex-1 text-xs sm:text-sm"
          >
            Return Home
          </Button>
        </div>
      </main>
    </div>
  )
}
