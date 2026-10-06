'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  FireIcon,
  HeartIcon,
  BoltIcon,
  SparklesIcon,
  GlobeIcon,
  UsersIcon,
  EyeIcon,
  HandIcon,
  VideoIcon,
} from '@/components/icons'
import { haptics } from '@/utils/haptics'
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
  'from-rose-600/40 via-pink-700/30 to-[#160e0a]',
  'from-amber-600/40 via-orange-700/30 to-[#160e0a]',
  'from-violet-600/40 via-purple-700/30 to-[#160e0a]',
  'from-emerald-600/40 via-teal-700/30 to-[#160e0a]',
  'from-sky-600/40 via-blue-700/30 to-[#160e0a]',
  'from-fuchsia-600/40 via-purple-800/30 to-[#160e0a]',
  'from-red-600/40 via-rose-700/30 to-[#160e0a]',
  'from-teal-600/40 via-cyan-700/30 to-[#160e0a]',
]

interface NichesBarProps {
  selectedNiche: string | null
  onSelect: (nicheId: string | null) => void
}

export default function NichesBar({ selectedNiche, onSelect }: NichesBarProps) {
  const [niches, setNiches] = useState<Niche[]>([])
  const [hoveredNiche, setHoveredNiche] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const previewCache = useRef<Record<string, string>>({})
  const [generatedNiches, setGeneratedNiches] = useState<Niche[]>([])
  const [generationPrompt, setGenerationPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationMessage, setGenerationMessage] = useState('')

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

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const prompt = generationPrompt.trim()
    if (!prompt || isGenerating) return

    setIsGenerating(true)
    setGenerationMessage('')
    try {
      const response = await fetch('/api/generate-niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, existingNiches: [...niches, ...generatedNiches].map((niche) => niche.name) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Niche generation failed.')

      const existingIds = new Set([...niches, ...generatedNiches].map((niche) => niche.id.toLowerCase()))
      const received: unknown[] = Array.isArray(data.niches) ? data.niches : []
      const generated = received.filter((item): item is Niche => {
        if (!item || typeof item !== 'object') return false
        const candidate = item as Partial<Niche>
        return typeof candidate.id === 'string'
          && typeof candidate.name === 'string'
          && typeof candidate.icon === 'string'
          && !existingIds.has(candidate.id.toLowerCase())
      })

      if (generated.length === 0) throw new Error('No new niche ideas came back. Try a different theme.')
      setGeneratedNiches(generated)
      setGenerationMessage(`${generated.length} ideas ready — select one to search clips.`)
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : 'Niche generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Lazy-fetch top preview clip for hovered category (like RedGifs native UI)
  const handleMouseEnter = async (nicheId: string) => {
    setHoveredNiche(nicheId)
    if (previewCache.current[nicheId]) {
      setPreviews((prev) => ({ ...prev, [nicheId]: previewCache.current[nicheId] }))
      return
    }

    try {
      const res = await fetch(`/api/search-redgifs?q=${encodeURIComponent(nicheId)}&action=niche&count=1`)
      const data = await res.json()
      if (Array.isArray(data) && data[0]?.preview) {
        const previewUrl = data[0].preview as string
        previewCache.current[nicheId] = previewUrl
        setPreviews((prev) => ({ ...prev, [nicheId]: previewUrl }))
      }
    } catch {
      // Ignore preview fetch failures silently
    }
  }

  const handleMouseLeave = () => {
    setHoveredNiche(null)
  }

  const handleClick = (nicheId: string) => {
    haptics.confirm()
    onSelect(selectedNiche === nicheId ? null : nicheId)
  }

  const visibleNiches = [...generatedNiches, ...niches]

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="text-xs uppercase tracking-widest font-mono text-amber-400/90 font-medium">
            Explore Vibes & Categories
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#a89582]">{visibleNiches.length} niches</span>
      </div>

      <form onSubmit={handleGenerate} aria-busy={isGenerating} className="mb-4 rounded-xl border border-amber-900/30 bg-[#160e0a]/70 p-3 sm:p-3.5">
        <label htmlFor="niche-theme" className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-200/90">
          <SparklesIcon className="h-3.5 w-3.5 text-amber-400" />
          Generate niche ideas
        </label>
        <div className="flex gap-2">
          <input
            id="niche-theme"
            value={generationPrompt}
            onChange={(event) => setGenerationPrompt(event.target.value)}
            maxLength={140}
            placeholder="Try: romantic, cinematic, date-night"
            className="min-w-0 flex-1 rounded-lg border border-amber-900/35 bg-[#0e0a07]/80 px-3 py-2 text-xs text-[#f5ebe0] placeholder:text-[#806f5e] outline-none focus:border-amber-600/70"
          />
          <button
            type="submit"
            disabled={!generationPrompt.trim() || isGenerating}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-700 to-orange-700 px-3 py-2 text-xs font-semibold text-white transition hover:from-amber-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isGenerating ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <SparklesIcon className="h-3.5 w-3.5" />
            )}
            {isGenerating ? 'Creating…' : 'Generate'}
          </button>
        </div>
        {generationMessage && (
          <p role="status" className="mt-2 text-[11px] text-[#c8a875]">{generationMessage}</p>
        )}
      </form>

      {/* Horizontally scrolling Mood Ring Carousel */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {visibleNiches.map((niche, index) => {
          const IconComp = ICON_MAP[niche.icon] || SparklesIcon
          const isSelected = selectedNiche === niche.id
          const isGenerated = generatedNiches.some((item) => item.id === niche.id)
          const previewSrc = previews[niche.id]
          const isHovered = hoveredNiche === niche.id

          return (
            <button
              key={niche.id}
              onClick={() => handleClick(niche.id)}
              onMouseEnter={() => handleMouseEnter(niche.id)}
              onMouseLeave={handleMouseLeave}
              aria-pressed={isSelected}
              className={`group relative shrink-0 w-32 sm:w-36 rounded-2xl overflow-hidden text-left cursor-pointer btn-press border transition-all duration-300 snap-start aspect-[3/4] ${
                isSelected
                  ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-xl shadow-amber-950/60'
                  : 'border-amber-900/30 hover:border-amber-600/50 hover:shadow-lg hover:shadow-amber-950/40'
              }`}
            >
              {/* Background Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  TILE_GRADIENTS[index % TILE_GRADIENTS.length]
                } transition-opacity duration-300`}
              />

              {/* Live Animated Looping Preview Video from RedGifs Top Ranked Clip */}
              {previewSrc && (
                <video
                  src={previewSrc}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    isHovered || isSelected ? 'opacity-85 scale-105' : 'opacity-35'
                  }`}
                />
              )}

              {/* Faded background icon fallback */}
              {!previewSrc && (
                <div className="absolute -right-4 -bottom-4 opacity-15 transition-all duration-500 group-hover:scale-110 group-hover:opacity-25">
                  <IconComp className="w-24 h-24 text-amber-200" />
                </div>
              )}

              {/* Dark vignette overlay for crisp readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0a07] via-[#0e0a07]/50 to-transparent" />

              {/* Top Accent Icon */}
              <div className="relative p-3 flex justify-between items-start z-10">
                <span className="p-1.5 rounded-lg bg-[#0e0a07]/60 backdrop-blur-md border border-amber-900/40 text-amber-300">
                  <IconComp className="w-3.5 h-3.5" />
                </span>
                {isGenerated && (
                  <span className="rounded-md border border-amber-400/30 bg-amber-950/70 px-1.5 py-1 text-[9px] font-semibold tracking-wider text-amber-200">
                    AI
                  </span>
                )}
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>

              {/* Bottom Label */}
              <div className="absolute bottom-0 inset-x-0 p-3 z-10">
                <p className="text-xs sm:text-sm font-semibold text-[#f5ebe0] truncate group-hover:text-amber-200 transition-colors">
                  {niche.name}
                </p>
                <div
                  className={`h-0.5 bg-amber-400/80 rounded-full mt-1.5 transition-all duration-300 ${
                    isSelected ? 'w-full' : 'w-4 group-hover:w-8'
                  }`}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
