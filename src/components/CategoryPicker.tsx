'use client'

import { useState } from 'react'
import { FireIcon2, LipsIcon, TargetIcon, TimerIcon } from './icons'

interface CategoryPickerProps {
  onSelect: (category: string, action: string) => void
}

export type QuestTier = 'tease' | 'dares' | 'edge'

const TIERS: { id: QuestTier; label: string; desc: string }[] = [
  { id: 'tease', label: 'Tier 1: Tease', desc: 'Slow, sensual touches & breath' },
  { id: 'dares', label: 'Tier 2: Dares', desc: 'Pacing, positions & rhythm' },
  { id: 'edge', label: 'Tier 3: Edge', desc: 'Edging, denial & climax command' },
]

const TIER_CATEGORIES: Record<QuestTier, { id: string; label: string; Icon: typeof FireIcon2; actions: string[] }[]> = {
  tease: [
    {
      id: 'sensual_touch',
      label: 'Gentle Touch',
      Icon: LipsIcon,
      actions: ['Touch your lips', 'Trace your neck slowly', 'Gentle fingertips only', 'Close your eyes and breathe'],
    },
    {
      id: 'tease_pace',
      label: 'Soft Rhythm',
      Icon: FireIcon2,
      actions: ['Slow right down', 'Match my breathing', 'Gentle circular motion', 'Pause and look at me'],
    },
  ],
  dares: [
    {
      id: 'positions',
      label: 'Dares & Moves',
      Icon: TargetIcon,
      actions: ['Change your angle', 'Show me what you love', 'Increase your rhythm', 'Arch your back'],
    },
    {
      id: 'intensity',
      label: 'Building Heat',
      Icon: FireIcon2,
      actions: ['Harder rhythm', 'Faster now', 'Keep this exact pace', 'Whisper what you feel'],
    },
  ],
  edge: [
    {
      id: 'edging',
      label: 'Edge Control',
      Icon: TimerIcon,
      actions: ['Edge for 15 seconds', 'Hands off right now', 'Hold right at the edge', 'Cool down slowly'],
    },
    {
      id: 'permission',
      label: 'Commands',
      Icon: TargetIcon,
      actions: ['Hold until I say', 'Permission to release', 'One more edge cycle', 'Let go completely'],
    },
  ],
}

export default function CategoryPicker({ onSelect }: CategoryPickerProps) {
  const [activeTier, setActiveTier] = useState<QuestTier>('tease')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const currentCategories = TIER_CATEGORIES[activeTier]

  return (
    <div className="space-y-3">
      {/* Tier Selection Pills ([Q012]) */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-[10px] uppercase tracking-wider text-amber-400/90 font-medium">Quest Escalation Ladder</p>
          <span className="text-[10px] text-[#8c7867]">{TIERS.find(t => t.id === activeTier)?.desc}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#140d08]/80 border border-amber-900/35">
          {TIERS.map(tier => (
            <button
              key={tier.id}
              onClick={() => {
                setActiveTier(tier.id)
                setExpandedCategory(null)
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                activeTier === tier.id
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm'
                  : 'text-[#a89582] hover:text-[#f5ebe0]'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Accordion */}
      <div className="grid grid-cols-2 gap-2">
        {currentCategories.map((category, i) => (
          <div key={category.id} className="animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
            <button
              onClick={() => setExpandedCategory(
                expandedCategory === category.id ? null : category.id
              )}
              className={`w-full px-3 py-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 btn-press ${
                expandedCategory === category.id
                  ? 'border-amber-500/60 bg-amber-950/40 text-amber-200 shadow-md'
                  : 'border-amber-900/30 bg-[#1c130d]/80 text-[#d4c3b3] hover:border-amber-700/50 hover:bg-[#251a13]'
              }`}
            >
              <div className="flex items-center gap-2">
                <category.Icon className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium">{category.label}</span>
              </div>
              <span className="text-xs text-amber-400/60 font-mono">
                {expandedCategory === category.id ? '−' : '+'}
              </span>
            </button>

            <div className={`mt-2 space-y-1.5 ${expandedCategory === category.id ? 'animate-expand' : 'hidden'}`}>
              {category.actions.map((action, j) => (
                <button
                  key={action}
                  onClick={() => {
                    onSelect(`${activeTier}:${category.id}`, action)
                    setExpandedCategory(null)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#c7b5a3] hover:text-white bg-[#140d08]/70 hover:bg-amber-950/50 border border-amber-900/20 hover:border-amber-700/40 transition-all duration-150 cursor-pointer animate-fade-in btn-press"
                  style={{ animationDelay: `${j * 35}ms` }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
