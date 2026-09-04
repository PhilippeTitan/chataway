'use client'

import { useState } from 'react'

export type ControlRole = 'controller' | 'participant'
export type ControlState = 'idle' | 'offering' | 'pending' | 'granted' | 'declined' | 'reclaimed'

interface Suggestion {
  id: string
  text: string
  category: string
}

interface ControlPanelProps {
  controlState: ControlState
  role: ControlRole
  guidedMode: boolean
  incomingSuggestion: string
  partnerOnline: boolean
  onOfferControl: () => void
  onReclaimControl: () => void
  onAcceptControl: () => void
  onDeclineControl: () => void
  onSendSuggestion: (suggestion: string) => void
  onRespondToSuggestion: (response: 'accepted' | 'declined') => void
  onToggleGuidedMode: () => void
  onChooseAction: (action: string) => void
  onSendReaction: (text: string) => void
}

const REACTIONS = [
  { emoji: '🔥', text: 'This is hot', color: 'border-orange-500/40 hover:border-orange-400' },
  { emoji: '💋', text: 'I like this', color: 'border-pink-500/40 hover:border-pink-400' },
  { emoji: '⏱️', text: 'Slow down', color: 'border-blue-500/40 hover:border-blue-400' },
  { emoji: '⚡', text: 'Speed up', color: 'border-yellow-500/40 hover:border-yellow-400' },
  { emoji: '⏸️', text: 'Pause a moment', color: 'border-gray-500/40 hover:border-gray-400' },
  { emoji: '➡️', text: 'Skip this one', color: 'border-purple-500/40 hover:border-purple-400' },
]

const CONTROLLER_SUGGESTIONS: Suggestion[] = [
  { id: 's1', text: 'Try something new', category: 'Explore' },
  { id: 's2', text: 'Keep going like that', category: 'Pace' },
  { id: 's3', text: 'Take a breath', category: 'Pause' },
  { id: 's4', text: 'Show me what you like', category: 'Connect' },
  { id: 's5', text: 'Go faster', category: 'Pace' },
  { id: 's6', text: 'Go slower', category: 'Pace' },
]

const PARTICIPANT_ACTIONS = [
  { id: 'a1', text: 'I\'m ready', category: 'Status' },
  { id: 'a2', text: 'I need a break', category: 'Status' },
  { id: 'a3', text: 'I like this pace', category: 'Pace' },
  { id: 'a4', text: 'Pick something else', category: 'Request' },
  { id: 'a5', text: 'I\'m enjoying this', category: 'Feedback' },
  { id: 'a6', text: 'Your turn to choose', category: 'Handoff' },
]

export default function ControlPanel({
  controlState,
  role,
  guidedMode,
  incomingSuggestion,
  partnerOnline,
  onOfferControl,
  onReclaimControl,
  onAcceptControl,
  onDeclineControl,
  onSendSuggestion,
  onRespondToSuggestion,
  onToggleGuidedMode,
  onChooseAction,
  onSendReaction,
}: ControlPanelProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(null)
  const [suggestionResponse, setSuggestionResponse] = useState<'accepted' | 'declined' | null>(null)

  const handleSendSuggestion = (suggestion: Suggestion) => {
    setPendingSuggestionId(suggestion.id)
    setSuggestionResponse(null)
    onSendSuggestion(suggestion.text)
  }

  const handleRespond = (response: 'accepted' | 'declined') => {
    setSuggestionResponse(response)
    onRespondToSuggestion(response)
  }

  const getControlIndicator = () => {
    if (controlState === 'offering' || controlState === 'pending') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-300 text-xs font-medium">Waiting...</span>
        </div>
      )
    }
    if (role === 'controller') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50" />
          <span className="text-blue-300 text-xs font-medium">You lead</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-pink-400 shadow-lg shadow-pink-400/50" />
        <span className="text-pink-300 text-xs font-medium">They lead</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header: Control Status */}
      <div className="p-4 border-b border-gray-800 bg-gray-950/80">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-purple-300">Control</p>
            <h3 className="text-sm font-semibold text-white">
              {controlState === 'idle' && 'You both have control'}
              {controlState === 'offering' && 'Offering control...'}
              {controlState === 'pending' && 'Waiting for response...'}
              {controlState === 'granted' && (role === 'controller' ? 'You are guiding' : 'They are guiding')}
              {controlState === 'declined' && 'Offer declined'}
              {controlState === 'reclaimed' && 'Control returned to you'}
            </h3>
          </div>
          {getControlIndicator()}
        </div>

        {/* Partner Status */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-emerald-400' : 'bg-gray-600'}`} />
          <span className="text-[11px] text-gray-400">
            {partnerOnline ? 'Partner connected' : 'Partner offline'}
          </span>
        </div>

        {/* Control Actions */}
        {controlState === 'idle' && role === 'controller' && (
          <button
            onClick={onOfferControl}
            className="w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-semibold hover:from-purple-500 hover:to-pink-500 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Offer them control
          </button>
        )}

        {controlState === 'idle' && role === 'participant' && (
          <button
            onClick={onReclaimControl}
            className="w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-xs font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Take back control
          </button>
        )}

        {(controlState === 'offering' || controlState === 'pending') && (
          <div className="px-3 py-2.5 rounded-lg bg-amber-950/50 border border-amber-500/30 text-xs text-amber-200 text-center">
            Waiting for partner to respond...
          </div>
        )}

        {controlState === 'granted' && role === 'controller' && (
          <button
            onClick={onReclaimControl}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium transition cursor-pointer"
          >
            Return control to them
          </button>
        )}
      </div>

      {/* Guided Mode Toggle */}
      <div className="px-4 py-3 border-b border-gray-800">
        <button
          onClick={onToggleGuidedMode}
          className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            guidedMode
              ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
              : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {guidedMode ? 'Guided session active' : 'Start guided session'}
        </button>
      </div>

      {/* Main Content Area - Changes based on role */}
      <div className="flex-1 overflow-y-auto">
        {/* INCOMING SUGGESTION (when participant) */}
        {incomingSuggestion && role === 'participant' && (
          <div className="m-4 p-4 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/50 to-orange-950/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-[11px] uppercase tracking-wider text-amber-300">Suggestion for you</p>
            </div>
            <p className="text-sm text-white font-medium mb-3">{incomingSuggestion}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleRespond('accepted')}
                className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-xs font-semibold hover:bg-emerald-500 transition cursor-pointer"
              >
                Accept
              </button>
              <button
                onClick={() => handleRespond('declined')}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-700 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* SUGGESTION RESPONSE (when controller sent a suggestion) */}
        {suggestionResponse && (
          <div className={`m-4 p-3 rounded-lg text-xs text-center ${
            suggestionResponse === 'accepted'
              ? 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-300'
              : 'bg-gray-800 border border-gray-700 text-gray-400'
          }`}>
            {suggestionResponse === 'accepted' ? 'Suggestion accepted!' : 'Suggestion declined'}
          </div>
        )}

        {/* CONTROLLER VIEW: Suggestion Cards */}
        {role === 'controller' && guidedMode && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-500">Send a suggestion</p>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer"
              >
                {showSuggestions ? 'Less' : 'More'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CONTROLLER_SUGGESTIONS.slice(0, showSuggestions ? undefined : 4).map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSendSuggestion(suggestion)}
                  disabled={pendingSuggestionId !== null}
                  className="px-3 py-2.5 rounded-lg border border-gray-700 text-left hover:border-purple-400/50 hover:bg-purple-950/20 transition-all cursor-pointer disabled:opacity-50 group"
                >
                  <p className="text-[10px] text-gray-500 mb-0.5">{suggestion.category}</p>
                  <p className="text-xs text-gray-200 group-hover:text-white">{suggestion.text}</p>
                </button>
              ))}
            </div>
            {pendingSuggestionId && (
              <p className="mt-2 text-[10px] text-amber-300 text-center">Waiting for their response...</p>
            )}
          </div>
        )}

        {/* PARTICIPANT VIEW: Action Cards */}
        {role === 'participant' && guidedMode && (
          <div className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Your choices</p>
            <div className="grid grid-cols-2 gap-2">
              {PARTICIPANT_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onChooseAction(action.text)}
                  className="px-3 py-2.5 rounded-lg border border-gray-700 text-left hover:border-pink-400/50 hover:bg-pink-950/20 transition-all cursor-pointer group"
                >
                  <p className="text-[10px] text-gray-500 mb-0.5">{action.category}</p>
                  <p className="text-xs text-gray-200 group-hover:text-white">{action.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* QUICK REACTIONS */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="w-full text-[11px] uppercase tracking-wider text-gray-500 hover:text-gray-300 mb-3 cursor-pointer text-left"
          >
            Quick reactions {showReactions ? '▲' : '▼'}
          </button>
          {showReactions && (
            <div className="grid grid-cols-3 gap-2">
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction.text}
                  onClick={() => onSendReaction(reaction.text)}
                  className={`px-2 py-2.5 rounded-lg border ${reaction.color} text-center transition-all cursor-pointer hover:scale-105`}
                >
                  <span className="text-lg block">{reaction.emoji}</span>
                  <span className="text-[9px] text-gray-400 mt-1 block">{reaction.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
