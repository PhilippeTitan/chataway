'use client'

import { useState, useEffect } from 'react'
import { FireIcon, HeartIcon, BoltIcon, SparklesIcon, GlobeIcon, UsersIcon, EyeIcon, HandIcon, VideoIcon } from '@/components/icons'
import type { Niche } from '@/types/clips'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  fire: FireIcon,
  heart: HeartIcon,
  lips: SparklesIcon,
  body: EyeIcon,
  globe: GlobeIcon,
  sparkle: SparklesIcon,
  hand: HandIcon,
  bolt: BoltIcon,
  water: GlobeIcon,
  hair: SparklesIcon,
  video: VideoIcon,
  eye: EyeIcon,
  users: UsersIcon,
}

const TILE_GRADIENTS = [
  'from-rose-600 via-pink-700 to-[#1a0a12]',
  'from-amber-600 via-orange-700 to-[#1a100a]',
  'from-violet-600 via-purple-700 to-[#150a1a]',
  'from-emerald-600 via-teal-700 to-[#0a1a15]',
  'from-sky-600 via-blue-700 to-[#0a121a]',
  'from-fuchsia-600 via-purple-800 to-[#1a0a18]',
  'from-red-600 via-rose-700 to-[#1a0a0e]',
  'from-teal-600 via-cyan-700 to-[#0a1a1a]',
  'from-indigo-600 via-violet-700 to-[#0e0a1a]',
  'from-orange-600 via-red-700 to-[#1a0f0a]',
  'from-pink-600 via-fuchsia-700 to-[#1a0a15]',
  'from-cyan-600 via-blue-700 to-[#0a151a]',
]

interface NichesBarProps {
  selectedNiche: string | null
  onSelect: (nicheId: string | null) => void
}

export default function NichesBar({ selectedNiche, onSelect }: NichesBarProps) {
  const [niches, setNiches] = useState<Niche[]>([])

  useEffect(() => {
    const fetchNiches = async () => {
      try {
        const res = await fetch('/api/niches')
        const data = await res.json()
        if (Array.isArray(data)) {
          setNiches(data)
        }
      } catch (err) {
        console.error('Failed to load niches:', err)
      }
    }
    fetchNiches()
  }, [])

  if (niches.length === 0) return null

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-400/80">Niches</p>
          <h3 className="text-2xl font-serif text-[#fef9f5] mt-1">Browse by category</h3>
        </div>
        <span className="text-xs text-[#8c7867]">{niches.length} categories</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 stagger-children">
        {niches.map((niche, index) => {
          const IconComp = ICON_MAP[niche.icon] || SparklesIcon
          const isSelected = selectedNiche === niche.id
          return (
            <button
              key={niche.id}
              onClick={() => onSelect(niche.id)}
              className={`group relative overflow-hidden rounded-xl text-left cursor-pointer btn-press transition-all duration-300 animate-slide-up ${
                isSelected
                  ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-950/50'
                  : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40'
              }`}
              style={{ aspectRatio: '9/14' }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${TILE_GRADIENTS[index % TILE_GRADIENTS.length]}`} />

              {/* Large faded icon in background */}
              <div className="absolute -right-6 -bottom-8 opacity-10 transition-all duration-700 group-hover:opacity-20 group-hover:scale-110 group-hover:rotate-12">
                <IconComp className="w-36 h-36 text-white" />
              </div>

              {/* Dark overlay at bottom for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {/* Subtle shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content */}
              <div className="relative h-full flex flex-col justify-between p-4">
                <IconComp className="w-6 h-6 text-white/70 group-hover:text-white/90 transition-colors" />
                <div>
                  <span className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-lg">
                    {niche.name}
                  </span>
                  <div className="w-8 h-0.5 bg-amber-400/60 mt-2 rounded-full group-hover:w-12 transition-all duration-300" />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
