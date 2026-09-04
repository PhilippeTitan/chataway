'use client'

import { useState } from 'react'

export interface Quest {
  id: string
  text: string
  category: string
  sender: 'controller' | 'participant'
  status: 'pending' | 'accepted' | 'denied'
}

interface QuestBubbleProps {
  quest: Quest
  isMine: boolean
  fullAuto?: boolean
  onAccept?: (id: string) => void
  onDeny?: (id: string) => void
}

export default function QuestBubble({ quest, isMine, fullAuto = false, onAccept, onDeny }: QuestBubbleProps) {
  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      pace: '🔥',
      intensity: '💋',
      act: '🎯',
      duration: '⏱️',
      custom: '✨',
    }
    return emojis[category] || '✨'
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      pace: 'border-orange-500/30 bg-orange-950/20',
      intensity: 'border-pink-500/30 bg-pink-950/20',
      act: 'border-purple-500/30 bg-purple-950/20',
      duration: 'border-blue-500/30 bg-blue-950/20',
      custom: 'border-gray-500/30 bg-gray-950/20',
    }
    return colors[category] || 'border-gray-500/30 bg-gray-950/20'
  }

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isMine
        ? 'border-blue-500/30 bg-blue-950/20 ml-8'
        : `${getCategoryColor(quest.category)} mr-8`
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{getCategoryEmoji(quest.category)}</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-500">
          {isMine ? 'Your quest' : 'Quest for you'}
        </span>
        {quest.status === 'accepted' && (
          <span className="text-[10px] text-emerald-400 ml-auto">✓ Doing it</span>
        )}
        {quest.status === 'denied' && (
          <span className="text-[10px] text-gray-500 ml-auto">✗ Passed</span>
        )}
      </div>
      <p className="text-sm text-white font-medium">{quest.text}</p>

      {/* Action buttons for participant */}
      {!isMine && quest.status === 'pending' && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onAccept?.(quest.id)}
            className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold hover:bg-emerald-500 transition cursor-pointer"
          >
            Do it 🔥
          </button>
          <button
            onClick={() => onDeny?.(quest.id)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition cursor-pointer"
          >
            Nah
          </button>
        </div>
      )}

      {/* Full auto notification */}
      {!isMine && quest.status === 'pending' && fullAuto && (
        <p className="text-[10px] text-amber-300 mt-1">Auto-accepted — tap STOP to override</p>
      )}
    </div>
  )
}
