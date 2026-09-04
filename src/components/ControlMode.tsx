'use client'

import { useState, useRef, useEffect } from 'react'
import QuestBubble, { Quest } from './QuestBubble'
import RequestBubble, { Request } from './RequestBubble'
import SafetyExit from './SafetyExit'
import RoleSwitch from './RoleSwitch'
import CategoryPicker from './CategoryPicker'
import { BoltIcon, HeartIcon, StopIcon, ChatIcon, Spinner } from './icons'

export type ControlModeState = 'idle' | 'safety' | 'role_switch' | 'aftercare'

interface ControlModeProps {
  controlOwner: 'you' | 'them'
  partnerOnline: boolean
  onSendQuest: (text: string, category: string) => void
  onResponseToQuest: (id: string, accepted: boolean) => void
  onSendRequest: (text: string) => void
  onResponseToRequest: (id: string, accepted: boolean) => void
  onToggleFullAuto: (enabled: boolean) => void
  onICame: () => void
  onSafetyExit: (reason: string) => void
  onRoleSwitchAccept: () => void
  onRoleSwitchDecline: () => void
  onAftercare: () => void
  onDeactivate: () => void
}

export default function ControlMode({
  controlOwner,
  partnerOnline,
  onSendQuest,
  onResponseToQuest,
  onSendRequest,
  onResponseToRequest,
  onToggleFullAuto,
  onICame,
  onSafetyExit,
  onRoleSwitchAccept,
  onRoleSwitchDecline,
  onAftercare,
  onDeactivate,
}: ControlModeProps) {
  const [customQuest, setCustomQuest] = useState('')
  const [fullAuto, setFullAuto] = useState(false)
  const [modeState, setModeState] = useState<ControlModeState>('idle')
  const [quests, setQuests] = useState<Quest[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [roleSwitchInitiator, setRoleSwitchInitiator] = useState<'you' | 'them'>('you')
  const [pendingICame, setPendingICame] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [quests, requests])

  const handleSendCustomQuest = () => {
    if (!customQuest.trim()) return
    const quest: Quest = {
      id: `q_${Date.now()}`,
      text: customQuest.trim(),
      category: 'custom',
      sender: 'controller',
      status: 'pending',
    }
    setQuests(prev => [...prev, quest])
    onSendQuest(customQuest.trim(), 'custom')
    setCustomQuest('')
  }

  const handleCategorySelect = (category: string, action: string) => {
    const quest: Quest = {
      id: `q_${Date.now()}`,
      text: action,
      category,
      sender: 'controller',
      status: 'pending',
    }
    setQuests(prev => [...prev, quest])
    onSendQuest(action, category)
  }

  const handleQuestAccept = (id: string) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, status: 'accepted' as const } : q))
    onResponseToQuest(id, true)
  }

  const handleQuestDeny = (id: string) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, status: 'denied' as const } : q))
    onResponseToQuest(id, false)
  }

  const handleRequestAccept = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'accepted' as const } : r))
    onResponseToRequest(id, true)
  }

  const handleRequestDeny = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'denied' as const } : r))
    onResponseToRequest(id, false)
  }

  const handleFullAutoToggle = () => {
    const newState = !fullAuto
    setFullAuto(newState)
    onToggleFullAuto(newState)
  }

  const handleICame = () => {
    setPendingICame(true)
    setModeState('role_switch')
    setRoleSwitchInitiator(controlOwner === 'you' ? 'them' : 'you')
    onICame()
  }

  const handleSafetyExit = (reason: string) => {
    setModeState('safety')
    onSafetyExit(reason)
  }

  const handleRoleSwitchAccept = () => {
    setModeState('idle')
    onRoleSwitchAccept()
  }

  const handleRoleSwitchDecline = () => {
    setModeState('idle')
    onRoleSwitchDecline()
  }

  const handleAftercare = () => {
    setModeState('aftercare')
    onAftercare()
  }

  const isController = controlOwner === 'you'

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-950/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${isController ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 'bg-pink-400 shadow-lg shadow-pink-400/50'}`} />
            <div className="animate-fade-in">
              <p className="text-[11px] uppercase tracking-wider text-purple-300">Control mode</p>
              <h3 className="text-sm font-semibold text-white">
                {isController ? 'You lead' : 'They lead'}
              </h3>
            </div>
          </div>
          <button
            onClick={onDeactivate}
            className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-all cursor-pointer flex items-center gap-1 btn-press"
          >
            <ChatIcon className="w-3.5 h-3.5" />
            Back to chat
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${partnerOnline ? 'bg-emerald-400 animate-pulse-dot' : 'bg-gray-600'}`} />
          <span className="text-[11px] text-gray-400">
            {partnerOnline ? 'Connected' : 'Offline'}
          </span>
          {partnerOnline && <Spinner className="w-3 h-3 text-gray-500 ml-1" />}
        </div>
      </div>

      {/* Main content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {modeState === 'aftercare' && (
          <div className="rounded-xl border border-pink-500/30 bg-pink-950/20 p-4 text-center animate-scale-in">
            <HeartIcon className="w-8 h-8 text-pink-400 mx-auto mb-2 animate-pulse-dot" />
            <p className="text-sm font-medium text-white mb-1 animate-fade-in">Aftercare mode</p>
            <p className="text-xs text-gray-400 animate-fade-in" style={{ animationDelay: '100ms' }}>
              Just vibes. No more quests. Send reactions and enjoy the moment together.
            </p>
          </div>
        )}

        {modeState === 'role_switch' && (
          <RoleSwitch
            initiator={roleSwitchInitiator}
            onAccept={handleRoleSwitchAccept}
            onDecline={handleRoleSwitchDecline}
            onAftercare={handleAftercare}
          />
        )}

        {modeState === 'safety' && (
          <SafetyExit
            onSend={(reason) => {
              onSafetyExit(reason)
              setModeState('idle')
            }}
            onClose={() => setModeState('idle')}
          />
        )}

        <div className="stagger-children">
          {quests.map((quest) => (
            <div key={quest.id} className="mb-3">
              <QuestBubble
                quest={quest}
                isMine={quest.sender === 'controller' && isController}
                fullAuto={fullAuto && !isController}
                onAccept={handleQuestAccept}
                onDeny={handleQuestDeny}
              />
            </div>
          ))}
        </div>

        <div className="stagger-children">
          {requests.map((request) => (
            <div key={request.id} className="mb-3">
              <RequestBubble
                request={request}
                isMine={request.status !== 'pending'}
                onAccept={handleRequestAccept}
                onDeny={handleRequestDeny}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      {modeState === 'idle' && (
        <div className="border-t border-gray-800 p-4 space-y-3 animate-fade-in">
          {isController && (
            <>
              <CategoryPicker onSelect={handleCategorySelect} />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuest}
                  onChange={(e) => setCustomQuest(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCustomQuest()}
                  placeholder="Custom quest..."
                  className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                />
                <button
                  onClick={handleSendCustomQuest}
                  disabled={!customQuest.trim()}
                  className="px-4 py-2 bg-purple-600 rounded-lg text-xs font-semibold hover:bg-purple-500 disabled:opacity-50 transition-all cursor-pointer btn-press"
                >
                  Send
                </button>
              </div>
            </>
          )}

          {!isController && (
            <div className="flex gap-2">
              <input
                type="text"
                value={customQuest}
                onChange={(e) => setCustomQuest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customQuest.trim()) {
                    const req: Request = {
                      id: `r_${Date.now()}`,
                      text: customQuest.trim(),
                      status: 'pending',
                    }
                    setRequests(prev => [...prev, req])
                    onSendRequest(customQuest.trim())
                    setCustomQuest('')
                  }
                }}
                placeholder="Request something..."
                className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
              />
              <button
                onClick={() => {
                  if (customQuest.trim()) {
                    const req: Request = {
                      id: `r_${Date.now()}`,
                      text: customQuest.trim(),
                      status: 'pending',
                    }
                    setRequests(prev => [...prev, req])
                    onSendRequest(customQuest.trim())
                    setCustomQuest('')
                  }
                }}
                disabled={!customQuest.trim()}
                className="px-4 py-2 bg-pink-600 rounded-lg text-xs font-semibold hover:bg-pink-500 disabled:opacity-50 transition-all cursor-pointer btn-press"
              >
                Request
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!isController && (
              <button
                onClick={handleFullAutoToggle}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 btn-press ${
                  fullAuto
                    ? 'bg-amber-600/20 border border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
                    : 'bg-gray-800 border border-gray-700 text-gray-400'
                }`}
              >
                <BoltIcon className={`w-3.5 h-3.5 transition-transform duration-300 ${fullAuto ? 'scale-110' : ''}`} />
                Full auto {fullAuto ? 'ON' : 'OFF'}
              </button>
            )}

            <button
              onClick={handleICame}
              disabled={pendingICame}
              className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-semibold hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5 btn-press"
            >
              <HeartIcon className="w-3.5 h-3.5" />
              I came
            </button>

            <button
              onClick={() => handleSafetyExit('')}
              className="px-3 py-2 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-all cursor-pointer flex items-center gap-1.5 btn-press"
            >
              <StopIcon className="w-3.5 h-3.5" />
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
