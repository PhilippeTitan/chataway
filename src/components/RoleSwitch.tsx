'use client'

import { useState } from 'react'
import { SwitchIcon, HeartIcon } from './icons'

interface RoleSwitchProps {
  initiator: 'you' | 'them'
  onAccept: () => void
  onDecline: () => void
  onAftercare: () => void
}

export default function RoleSwitch({ initiator, onAccept, onDecline, onAftercare }: RoleSwitchProps) {
  const [responded, setResponded] = useState(false)

  const handleAccept = () => {
    setResponded(true)
    onAccept()
  }

  const handleDecline = () => {
    setResponded(true)
    onDecline()
  }

  if (responded) {
    return (
      <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 animate-fade-in">
        <p className="text-sm text-gray-400">Response sent.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 animate-scale-in">
      <div className="flex items-center gap-2 mb-3">
        <HeartIcon className="w-5 h-5 text-purple-400" />
        <div className="animate-fade-in">
          <p className="text-sm font-medium text-white">
            {initiator === 'you' ? 'They finished!' : 'You finished!'}
          </p>
          <p className="text-[10px] text-gray-400">Want to switch roles?</p>
        </div>
      </div>

      <div className="space-y-2 stagger-children">
        <button
          onClick={handleAccept}
          className="w-full px-3 py-2.5 rounded-lg bg-purple-600 text-xs font-semibold hover:bg-purple-500 transition-all cursor-pointer flex items-center justify-center gap-2 btn-press animate-slide-up"
        >
          <SwitchIcon className="w-4 h-4" />
          Switch roles
        </button>
        <button
          onClick={handleDecline}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-all cursor-pointer btn-press animate-slide-up"
        >
          Keep going as is
        </button>
        <button
          onClick={onAftercare}
          className="w-full px-3 py-2.5 rounded-lg border border-pink-500/30 text-xs text-pink-300 hover:bg-pink-950/30 transition-all cursor-pointer flex items-center justify-center gap-2 btn-press animate-slide-up"
        >
          <HeartIcon className="w-4 h-4" />
          Aftercare mode
        </button>
      </div>
    </div>
  )
}
