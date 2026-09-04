'use client'

import { SparklesIcon, CheckCircleIcon, XCircleIcon, HeartIcon } from './icons'

export interface Request {
  id: string
  text: string
  status: 'pending' | 'accepted' | 'denied'
}

interface RequestBubbleProps {
  request: Request
  isMine: boolean
  onAccept?: (id: string) => void
  onDeny?: (id: string) => void
}

export default function RequestBubble({ request, isMine, onAccept, onDeny }: RequestBubbleProps) {
  return (
    <div className={`rounded-xl border p-3 transition-all duration-300 animate-slide-up ${
      isMine
        ? 'border-pink-500/30 bg-pink-950/20 ml-8'
        : 'border-amber-500/30 bg-amber-950/20 mr-8'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <SparklesIcon className="w-4 h-4 text-gray-400" />
        <span className="text-[10px] uppercase tracking-wider text-gray-500">
          {isMine ? 'Your request' : 'Request from them'}
        </span>
        {request.status === 'accepted' && (
          <span className="text-[10px] text-emerald-400 ml-auto flex items-center gap-1 animate-fade-in">
            <CheckCircleIcon className="w-3 h-3" /> Granted
          </span>
        )}
        {request.status === 'denied' && (
          <span className="text-[10px] text-gray-500 ml-auto flex items-center gap-1 animate-fade-in">
            <XCircleIcon className="w-3 h-3" /> Not now
          </span>
        )}
      </div>
      <p className="text-sm text-white">{request.text}</p>

      {!isMine && request.status === 'pending' && (
        <div className="flex gap-2 mt-2 animate-fade-in">
          <button
            onClick={() => onAccept?.(request.id)}
            className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold hover:bg-emerald-500 transition-all cursor-pointer flex items-center justify-center gap-1 btn-press"
          >
            <HeartIcon className="w-3.5 h-3.5" />
            Sure
          </button>
          <button
            onClick={() => onDeny?.(request.id)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-all cursor-pointer btn-press"
          >
            Not now
          </button>
        </div>
      )}
    </div>
  )
}
