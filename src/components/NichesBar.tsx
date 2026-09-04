'use client'

import { useState, useEffect, useRef } from 'react'
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

interface NichesBarProps {
  selectedNiche: string | null
  onSelect: (nicheId: string | null) => void
}

export default function NichesBar({ selectedNiche, onSelect }: NichesBarProps) {
  const [niches, setNiches] = useState<Niche[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

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
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* All/Trending button */}
        <button
          onClick={() => onSelect(null)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer btn-press shrink-0 ${
            selectedNiche === null
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
              : 'bg-[#1c130d] border border-amber-900/35 text-[#c7b5a3] hover:bg-[#2b1d14] hover:text-white'
          }`}
        >
          <FireIcon className="w-4 h-4" />
          All
        </button>

        {niches.filter(n => n.id !== 'trending').map((niche) => {
          const IconComp = ICON_MAP[niche.icon] || SparklesIcon
          return (
            <button
              key={niche.id}
              onClick={() => onSelect(niche.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer btn-press shrink-0 ${
                selectedNiche === niche.id
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                  : 'bg-[#1c130d] border border-amber-900/35 text-[#c7b5a3] hover:bg-[#2b1d14] hover:text-white'
              }`}
            >
              <IconComp className="w-4 h-4" />
              {niche.name}
            </button>
          )
        })}
      </div>

      {/* Fade edges */}
      <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[#0e0a07] to-transparent pointer-events-none" />
    </div>
  )
}
