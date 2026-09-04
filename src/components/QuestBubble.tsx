'use client'

import { FireIcon2, LipsIcon, TargetIcon, TimerIcon, SparklesIcon, CheckCircleIcon, XCircleIcon } from './icons'

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

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pace: FireIcon2,
  intensity: LipsIcon,
  act: TargetIcon,
  duration: TimerIcon,
  custom: SparklesIcon,
}

const CATEGORY_COLORS: Record<string, string> = {
  pace: 'border-orange-500/30 bg-orange-950/20',
  intensity: 'border-pink-500/30 bg-pink-950/20',
  act: 'border-purple-500/30 bg-purple-950/20',
  duration: 'border-blue-500/30 bg-blue-950/20',
  custom: 'border-gray-500/30 bg-gray-950/20',
}

export default function QuestBubble({ quest, isMine, fullAuto = false, onAccept, onDeny }: QuestBubbleProps) {
  const Icon = CATEGORY_ICONS[quest.category] || SparklesIcon
  const colorClass = CATEGORY_COLORS[quest.category] || CATEGORY_COLORS.custom

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isMine
        ? 'border-blue-500/30 bg-blue-950/20 ml-8'
        : `${colorClass} mr-8`
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-[10px] uppercase tracking-wider text-gray-500">
          {isMine ? 'Your quest' : 'Quest for you'}
        </span>
        {quest.status === 'accepted' && (
          <span className="text-[10px] text-emerald-400 ml-auto flex items-center gap-1">
            <CheckCircleIcon className="w-3 h-3" /> Doing it
          </span>
        )}
        {quest.status === 'denied' && (
          <span className="text-[10px] text-gray-500 ml-auto flex items-center gap-1">
            <XCircleIcon className="w-3 h-3" /> Passed
          </span>
        )}
      </div>
      <p className="text-sm text-white font-medium">{quest.text}</p>

      {!isMine && quest.status === 'pending' && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onAccept?.(quest.id)}
            className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold hover:bg-emerald-500 transition cursor-pointer flex items-center justify-center gap-1"
          >
            <FireIcon2 className="w-3.5 h-3.5" />
            Do it
          </button>
          <button
            onClick={() => onDeny?.(quest.id)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition cursor-pointer"
          >
            Nah
          </button>
        </div>
      )}

      {!isMine && quest.status === 'pending' && fullAuto && (
        <p className="text-[10px] text-amber-300 mt-1">Auto-accepted — tap STOP to override</p>
      )}
    </div>
  )
}
