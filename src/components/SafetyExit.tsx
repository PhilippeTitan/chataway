'use client'

import { useState } from 'react'
import { StopIcon, PauseCircleIcon, WaveformIcon, SwitchIcon, XCircleIcon } from './icons'

type SafetyStep = 'initial' | 'response' | 'waiting'

interface SafetyExitProps {
  onSend: (reason: string) => void
  onClose: () => void
}

const CARE_RESPONSES = [
  { id: 'uncomfortable', text: 'I feel uncomfortable with...', Icon: XCircleIcon },
  { id: 'break', text: 'I need a break', Icon: PauseCircleIcon },
  { id: 'slower', text: "I'm good, just slower", Icon: WaveformIcon },
  { id: 'switch', text: "Let's switch roles", Icon: SwitchIcon },
  { id: 'stop', text: "Let's stop for now", Icon: StopIcon },
]

export default function SafetyExit({ onSend, onClose }: SafetyExitProps) {
  const [step, setStep] = useState<SafetyStep>('initial')
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')

  const handleResponseSelect = (id: string, text: string) => {
    setSelectedResponse(id)
    if (id === 'uncomfortable') {
      setStep('response')
    } else {
      onSend(text)
      setStep('waiting')
    }
  }

  const handleCustomSubmit = () => {
    if (customReason.trim()) {
      onSend(`I feel uncomfortable with ${customReason.trim()}`)
      setStep('waiting')
    }
  }

  if (step === 'waiting') {
    return (
      <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 animate-scale-in">
        <div className="flex items-center gap-2 mb-2">
          <StopIcon className="w-5 h-5 text-blue-400" />
          <p className="text-sm font-medium text-white animate-fade-in">Message sent</p>
        </div>
        <p className="text-xs text-gray-400 mb-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
          Your partner will see this. Take your time.
        </p>
        <button
          onClick={onClose}
          className="w-full px-3 py-2 rounded-lg bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 transition-all cursor-pointer btn-press"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 animate-scale-in">
      <div className="flex items-center gap-2 mb-3">
        <StopIcon className="w-5 h-5 text-blue-400" />
        <div>
          <p className="text-sm font-medium text-white">Hey, what's up?</p>
          <p className="text-[10px] text-gray-400">No judgment. Just tell me.</p>
        </div>
      </div>

      {step === 'initial' && (
        <div className="space-y-2 stagger-children">
          {CARE_RESPONSES.map((response) => (
            <button
              key={response.id}
              onClick={() => handleResponseSelect(response.id, response.text)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-2 btn-press animate-slide-up ${
                selectedResponse === response.id
                  ? 'border-blue-400 bg-blue-900/30 text-white'
                  : 'border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
              }`}
            >
              <response.Icon className="w-4 h-4 text-gray-400" />
              {response.text}
            </button>
          ))}
        </div>
      )}

      {step === 'response' && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs text-gray-400">What's making you uncomfortable?</p>
          <input
            type="text"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            placeholder="Tell me more..."
            className="w-full px-3 py-2 bg-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCustomSubmit}
              disabled={!customReason.trim()}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-xs font-semibold hover:bg-blue-500 disabled:opacity-50 transition-all cursor-pointer btn-press"
            >
              Send
            </button>
            <button
              onClick={() => setStep('initial')}
              className="px-3 py-2 rounded-lg border border-gray-700 text-xs text-gray-300 hover:text-white transition-all cursor-pointer btn-press"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
