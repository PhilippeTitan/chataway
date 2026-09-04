'use client'

import { useState } from 'react'
import { FireIcon2, LipsIcon, TargetIcon, TimerIcon } from './icons'

interface CategoryPickerProps {
  onSelect: (category: string, action: string) => void
}

const CATEGORIES = [
  {
    id: 'pace',
    label: 'Pace',
    Icon: FireIcon2,
    color: 'border-orange-500/40 hover:border-orange-400 hover:bg-orange-950/30',
    activeColor: 'border-orange-400 bg-orange-950/30 ring-1 ring-orange-400/20',
    actions: ['Go faster', 'Go slower', 'Keep this pace', 'Build up slowly'],
  },
  {
    id: 'intensity',
    label: 'Intensity',
    Icon: LipsIcon,
    color: 'border-pink-500/40 hover:border-pink-400 hover:bg-pink-950/30',
    activeColor: 'border-pink-400 bg-pink-950/30 ring-1 ring-pink-400/20',
    actions: ['Harder', 'Softer', 'Tease more', 'Don\'t stop'],
  },
  {
    id: 'act',
    label: 'Try this',
    Icon: TargetIcon,
    color: 'border-purple-500/40 hover:border-purple-400 hover:bg-purple-950/30',
    activeColor: 'border-purple-400 bg-purple-950/30 ring-1 ring-purple-400/20',
    actions: ['Use your fingers', 'Touch yourself', 'Show me', 'Close your eyes'],
  },
  {
    id: 'duration',
    label: 'Duration',
    Icon: TimerIcon,
    color: 'border-blue-500/40 hover:border-blue-400 hover:bg-blue-950/30',
    activeColor: 'border-blue-400 bg-blue-950/30 ring-1 ring-blue-400/20',
    actions: ['Hold it', 'Take your time', 'Quick now', 'Edge for me'],
  },
]

export default function CategoryPicker({ onSelect }: CategoryPickerProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">Send a quest</p>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((category, i) => (
          <div key={category.id} className="animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
            <button
              onClick={() => setExpandedCategory(
                expandedCategory === category.id ? null : category.id
              )}
              className={`w-full px-3 py-2.5 rounded-lg border text-left transition-all duration-200 cursor-pointer flex items-center gap-2 btn-press ${
                expandedCategory === category.id ? category.activeColor : category.color
              }`}
            >
              <category.Icon className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-200">{category.label}</span>
            </button>

            <div className={`mt-2 space-y-1 pl-1 ${expandedCategory === category.id ? 'animate-expand' : 'hidden'}`}>
              {category.actions.map((action, j) => (
                <button
                  key={action}
                  onClick={() => {
                    onSelect(category.id, action)
                    setExpandedCategory(null)
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-150 cursor-pointer animate-fade-in btn-press"
                  style={{ animationDelay: `${j * 40}ms` }}
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
