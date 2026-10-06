'use client'

import React from 'react'
import { SparklesIcon, CheckIcon, BackIcon } from '@/components/icons'
import { haptics } from '@/utils/haptics'

export type InteractionVariant = 'quest' | 'request' | 'praise'

export interface InteractionBubbleProps {
  variant: InteractionVariant
  text: string
  fromMe: boolean
  isPending?: boolean
  tier?: 1 | 2 | 3
  onAccept?: () => void
  onDecline?: () => void
  onComplete?: () => void
}

export const InteractionBubble: React.FC<InteractionBubbleProps> = ({
  variant,
  text,
  fromMe,
  isPending = false,
  tier = 1,
  onAccept,
  onDecline,
  onComplete,
}) => {
  const tierBadges = {
    1: 'Tier 1 · Tease',
    2: 'Tier 2 · Dare',
    3: 'Tier 3 · Edge',
  }

  const borderStyles =
    variant === 'praise'
      ? 'border-emerald-500/40 bg-emerald-950/20 shadow-emerald-950/30'
      : tier === 3
      ? 'border-rose-500/40 bg-rose-950/20 shadow-rose-950/30'
      : tier === 2
      ? 'border-orange-500/40 bg-orange-950/20 shadow-orange-950/30'
      : 'border-amber-500/40 bg-amber-950/20 shadow-amber-950/30'

  return (
    <div
      className={`my-2 p-3 sm:p-3.5 rounded-2xl border backdrop-blur-md shadow-xl animate-slide-up max-w-sm ${borderStyles} ${
        fromMe ? 'ml-auto' : 'mr-auto'
      }`}
    >
      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-amber-300">
          <SparklesIcon className="w-3 h-3 text-amber-400" />
          <span>{variant === 'praise' ? 'Sanctuary Affirmation' : tierBadges[tier]}</span>
        </span>
        <span className="text-[10px] text-[#a89582]">
          {fromMe ? 'You proposed' : 'Partner proposed'}
        </span>
      </div>

      {/* Main Quest / Request Text */}
      <p className="text-xs sm:text-sm font-medium text-[#f5ebe0] leading-snug">
        {text}
      </p>

      {/* Action Buttons */}
      {!fromMe && isPending && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-amber-900/30">
          {onAccept && (
            <button
              onClick={() => {
                haptics.confirm()
                onAccept()
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold shadow-md cursor-pointer btn-press flex items-center justify-center gap-1"
            >
              <CheckIcon className="w-3 h-3" />
              <span>Accept</span>
            </button>
          )}

          {onComplete && (
            <button
              onClick={() => {
                haptics.confirm()
                onComplete()
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md cursor-pointer btn-press flex items-center justify-center gap-1"
            >
              <CheckIcon className="w-3 h-3" />
              <span>Done!</span>
            </button>
          )}

          {onDecline && (
            <button
              onClick={() => {
                haptics.lightTap()
                onDecline()
              }}
              className="py-1.5 px-3 rounded-xl bg-[#1c130d] hover:bg-[#261b14] border border-amber-900/35 text-[#a89582] hover:text-[#f5ebe0] text-xs cursor-pointer btn-press"
            >
              Decline
            </button>
          )}
        </div>
      )}
    </div>
  )
}
