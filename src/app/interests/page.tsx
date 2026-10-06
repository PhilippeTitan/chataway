'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, PlayIcon, SparklesIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { useSanctuary } from '@/context/SanctuaryContext'
import { haptics } from '@/utils/haptics'

const DESIRE_TILES = [
  { name: 'Sensual & Slow', gradient: 'from-amber-600/30 to-orange-800/20' },
  { name: 'POV Exploration', gradient: 'from-orange-600/30 to-red-800/20' },
  { name: 'Amateur Intimacy', gradient: 'from-rose-600/30 to-pink-800/20' },
  { name: 'Romance & Velvet', gradient: 'from-purple-600/30 to-indigo-800/20' },
  { name: 'Daring Edge', gradient: 'from-red-600/30 to-rose-900/20' },
  { name: 'Blowjob & Tease', gradient: 'from-pink-600/30 to-purple-800/20' },
  { name: 'Cowgirl Rhythm', gradient: 'from-amber-500/30 to-yellow-800/20' },
  { name: 'Deep Doggy', gradient: 'from-emerald-600/30 to-teal-800/20' },
  { name: 'Masturbation & Solo', gradient: 'from-violet-600/30 to-purple-800/20' },
  { name: 'Squirting Waves', gradient: 'from-cyan-600/30 to-blue-800/20' },
  { name: 'Golden Hour Orgasm', gradient: 'from-orange-500/30 to-amber-700/20' },
  { name: 'Creampie Bliss', gradient: 'from-rose-500/30 to-red-800/20' },
  { name: 'Public Thrill', gradient: 'from-teal-600/30 to-cyan-800/20' },
  { name: 'Brunette Grace', gradient: 'from-stone-600/30 to-amber-900/20' },
  { name: 'Blonde Radiance', gradient: 'from-yellow-600/30 to-orange-800/20' },
  { name: 'Redhead Spark', gradient: 'from-red-500/30 to-orange-900/20' },
]

export default function DesireBoard() {
  const router = useRouter()
  const { setInterests: setGlobalInterests } = useSanctuary()
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (desire: string) => {
    haptics.lightTap()
    setSelected((prev) =>
      prev.includes(desire)
        ? prev.filter((d) => d !== desire)
        : prev.length < 8
        ? [...prev, desire]
        : prev
    )
  }

  const handleEnterMatchmaking = () => {
    haptics.confirm()
    setGlobalInterests(selected)
    sessionStorage.setItem('interests', JSON.stringify(selected))
    router.push('/queue')
  }

  const handleEnterSolo = () => {
    haptics.confirm()
    setGlobalInterests(selected)
    sessionStorage.setItem('interests', JSON.stringify(selected))
    router.push('/solo')
  }

  return (
    <div className="relative min-h-dvh bg-[#0e0a07] text-[#f5ebe0] flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none selection:bg-amber-700/30 selection:text-amber-200">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[40rem] h-[30rem] bg-amber-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="max-w-4xl mx-auto w-full pt-4 pb-2 text-center z-10">
        <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-mono text-amber-400/90 mb-1.5">
          Desire Board · Curate Your Vibe
        </span>
        <h2 className="text-2xl sm:text-3xl font-serif italic text-[#fef9f5]">
          What draws your attention tonight?
        </h2>
        <p className="text-xs sm:text-sm text-[#a89582] mt-1 font-light">
          Tap up to 8 vibes to align matchmaking and solo curation.
        </p>
      </header>

      {/* Visual Desire Tiles Grid [Q12] */}
      <main className="max-w-4xl mx-auto w-full py-6 z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 stagger-children">
          {DESIRE_TILES.map((tile) => {
            const isSelected = selected.includes(tile.name)
            return (
              <button
                key={tile.name}
                type="button"
                onClick={() => toggle(tile.name)}
                className={`group relative p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 btn-press animate-slide-up flex flex-col justify-between aspect-[16/11] ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-xl shadow-amber-950/60 bg-[#1e130a]'
                    : 'border-amber-900/30 hover:border-amber-600/50 hover:shadow-lg bg-[#140d08]/80'
                }`}
              >
                {/* Tile Background Gradient */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tile.gradient} opacity-50 group-hover:opacity-80 transition-opacity`}
                />

                {/* Top Pin Indicator */}
                <div className="relative z-10 flex justify-between items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                  {isSelected && (
                    <span className="text-[10px] font-mono text-amber-300 uppercase tracking-widest bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-900/40">
                      Selected
                    </span>
                  )}
                </div>

                {/* Bottom Tile Name */}
                <div className="relative z-10">
                  <h4 className="text-xs sm:text-sm font-semibold text-[#f5ebe0] leading-snug group-hover:text-amber-200 transition-colors">
                    {tile.name}
                  </h4>
                </div>
              </button>
            )
          })}
        </div>
      </main>

      {/* Bottom Dual-Path Action Drawer */}
      <footer className="max-w-xl mx-auto w-full pb-4 z-10">
        <div className="glass-panel p-4 rounded-2xl border border-amber-900/35 shadow-2xl flex flex-col sm:flex-row gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={handleEnterMatchmaking}
            leftIcon={<SearchIcon className="w-4 h-4" />}
            className="flex-1 py-3 text-xs sm:text-sm font-semibold"
          >
            Enter Matchmaking ({selected.length} selected)
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleEnterSolo}
            leftIcon={<PlayIcon className="w-4 h-4 text-amber-400" />}
            className="flex-1 py-3 text-xs sm:text-sm"
          >
            Unwind in Solo Lounge
          </Button>
        </div>
      </footer>
    </div>
  )
}