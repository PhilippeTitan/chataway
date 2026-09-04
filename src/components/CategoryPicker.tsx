'use client'

import { useState } from 'react'

interface CategoryPickerProps {
  onSelect: (category: string, action: string) => void
}

const CATEGORIES = [
  {
    id: 'pace',
    label: 'Pace',
    emoji: '🔥',
    color: 'border-orange-500/40 hover:border-orange-400 hover:bg-orange-950/30',
    actions: ['Go faster', 'Go slower', 'Keep this pace', 'Build up slowly'],
  },
  {
    id: 'intensity',
    label: 'Intensity',
    emoji: '💋',
    color: 'border-pink-500/40 hover:border-pink-400 hover:bg-pink-950/30',
    actions: ['Harder', 'Softer', 'Tease more', 'Don\'t stop'],
  },
  {
    id: 'act',
    label: 'Try this',
    emoji: '🎯',
    color: 'border-purple-500/40 hover:border-purple-400 hover:bg-purple-950/30',
    actions: ['Use your fingers', 'Touch yourself', 'Show me', 'Close your eyes'],
  },
  {
    id: 'duration',
    label: 'Duration',
    emoji: '⏱️',
    color: 'border-blue-500/40 hover:border-blue-400 hover:bg-blue-950/30',
    actions: ['Hold it', 'Take your time', 'Quick now', 'Edge for me'],
  },
]

export default function CategoryPicker({ onSelect }: CategoryPickerProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">Send a quest</p>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((category) => (
          <div key={category.id}>
            <button
              onClick={() => setExpandedCategory(
                expandedCategory === category.id ? null : category.id
              )}
              className={`w-full px-3 py-2.5 rounded-lg border text-left transition cursor-pointer ${category.color} ${
                expandedCategory === category.id ? 'ring-1 ring-white/20' : ''
              }`}
            >
              <span className="mr-1.5">{category.emoji}</span>
              <span className="text-xs font-medium text-gray-200">{category.label}</span>
            </button>
            
            {expandedCategory === category.id && (
              <div className="mt-2 space-y-1 pl-1">
                {category.actions.map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      onSelect(category.id, action)
                      setExpandedCategory(null)
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition cursor-pointer"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
