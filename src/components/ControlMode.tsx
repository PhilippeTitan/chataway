'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { InteractionBubble, Quest, Request } from './InteractionBubble'
import SafetyExit from './SafetyExit'
import RoleSwitch from './RoleSwitch'
import CategoryPicker from './CategoryPicker'
import { BoltIcon, HeartIcon, StopIcon, ChatIcon, Spinner, FireIcon2, TimerIcon } from './icons'

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
  const [closeSignalSent, setCloseSignalSent] = useState(false)
  
  // Hold-to-Edge Stopwatch State ([Q051])
  const [isHoldingEdge, setIsHoldingEdge] = useState(false)
  const [edgeSeconds, setEdgeSeconds] = useState(0)
  const edgeTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 3-Minute Afterglow Lounge Timer ([Q117])
  const [afterglowSeconds, setAfterglowSeconds] = useState(180)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [quests, requests])

  // Afterglow 3-minute countdown
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (modeState === 'aftercare' && afterglowSeconds > 0) {
      timer = setInterval(() => {
        setAfterglowSeconds(prev => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [modeState, afterglowSeconds])

  // Hold-to-Edge Stopwatch Logic ([Q051])
  const startEdgeHold = useCallback(() => {
    setIsHoldingEdge(true)
    setEdgeSeconds(0)
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(60)
    }
    edgeTimerRef.current = setInterval(() => {
      setEdgeSeconds(prev => +(prev + 0.1).toFixed(1))
    }, 100)
  }, [])

  const stopEdgeHold = useCallback(() => {
    if (!isHoldingEdge) return
    setIsHoldingEdge(false)
    if (edgeTimerRef.current) clearInterval(edgeTimerRef.current)

    const finalTime = edgeSeconds
    if (finalTime >= 2) {
      const edgeQuestText = `Edge completed: held for ${finalTime.toFixed(1)}s! Breathe and center.`
      const quest: Quest = {
        id: `q_edge_${Date.now()}`,
        text: edgeQuestText,
        category: 'edge:stopwatch',
        sender: 'controller',
        status: 'accepted',
      }
      setQuests(prev => [...prev, quest])
      onSendQuest(edgeQuestText, 'edge:stopwatch')
    }
    setEdgeSeconds(0)
  }, [isHoldingEdge, edgeSeconds, onSendQuest])

  // Safeword RED Interceptor ([Q127])
  const checkSafeword = (text: string): boolean => {
    const upper = text.toUpperCase().trim()
    if (upper === 'RED' || upper === 'SAFEWORD') {
      handleSafetyExit('Safeword RED invoked')
      return true
    }
    return false
  }

  const handleSendCustomQuest = () => {
    if (!customQuest.trim()) return
    if (checkSafeword(customQuest)) return

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

  const handleSendGettingClose = () => {
    setCloseSignalSent(true)
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([60, 40, 80])
    }
    const req: Request = {
      id: `r_close_${Date.now()}`,
      text: "I am getting so close...",
      status: 'pending',
    }
    setRequests(prev => [...prev, req])
    onSendRequest("I am getting so close...")
    setTimeout(() => setCloseSignalSent(false), 8000)
  }

  const handleRequestPermissionToClimax = () => {
    const req: Request = {
      id: `r_permission_${Date.now()}`,
      text: "May I have permission to climax?",
      status: 'pending',
    }
    setRequests(prev => [...prev, req])
    onSendRequest("May I have permission to climax?")
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
    <div className="flex flex-col h-full animate-fade-in bg-[#130c07] text-[#f5ebe0]">
      {/* Top Status Header */}
      <div className="p-3.5 border-b border-amber-900/30 bg-[#19100a]/90 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${isController ? 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]' : 'bg-orange-500 shadow-[0_0_12px_rgba(234,88,12,0.8)]'}`} />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-400/90 font-medium">Control Sanctuary</p>
              <h3 className="text-sm font-serif font-light text-[#fef9f5]">
                {isController ? 'You Hold the Reins' : 'Companion Leads'}
              </h3>
            </div>
          </div>
          <button
            onClick={onDeactivate}
            className="px-3 py-1.5 rounded-xl bg-[#241a13] border border-amber-900/35 text-xs text-[#d4c3b3] hover:text-[#fef9f5] hover:bg-[#32231a] transition cursor-pointer flex items-center gap-1.5 btn-press"
          >
            <ChatIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Chat</span>
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2 text-[11px] text-[#a89582]">
          <div className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-600'}`} />
          <span>{partnerOnline ? 'Companion synced' : 'Reconnecting...'}</span>
          {partnerOnline && <span className="text-amber-400/60 font-serif italic ml-1">· in private room</span>}
        </div>
      </div>

      {/* Main Quest Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e0a07]/50">
        {/* 3-Minute Afterglow Lounge ([Q117]) */}
        {modeState === 'aftercare' && (
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#261710] to-[#160c07] p-6 text-center animate-scale-in shadow-2xl">
            <HeartIcon className="w-10 h-10 text-amber-400 mx-auto mb-3 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-medium">
              3-Minute Afterglow Lounge
            </span>
            <h3 className="text-xl font-serif text-[#fef9f5] font-light mt-1 mb-2">
              Gentle Stillness
            </h3>
            <p className="text-xs text-[#c7b5a3] leading-relaxed max-w-xs mx-auto mb-5 font-light">
              Leave all tension behind. Rest here with your companion in peaceful breathing before stepping out.
            </p>

            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-amber-950/50 border border-amber-800/40 text-xs text-amber-200 font-mono mb-4">
              <TimerIcon className="w-4 h-4 text-amber-400" />
              <span>{Math.floor(afterglowSeconds / 60)}:{(afterglowSeconds % 60).toString().padStart(2, '0')} remaining</span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-xs text-[#a89582]">
              <span className="p-2 rounded-xl bg-[#140d08]/80 border border-amber-900/30">Deep breath</span>
              <span className="p-2 rounded-xl bg-[#140d08]/80 border border-amber-900/30">Quiet gratitude</span>
            </div>
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
            <div key={quest.id} className="mb-2">
              <InteractionBubble
                variant="quest"
                text={quest.text}
                fromMe={quest.sender === 'controller' && isController}
                isPending={quest.status === 'pending'}
                tier={1}
                onAccept={() => handleQuestAccept(quest.id)}
                onDecline={() => handleQuestDeny(quest.id)}
              />
            </div>
          ))}
        </div>

        <div className="stagger-children">
          {requests.map((request) => (
            <div key={request.id} className="mb-2">
              <InteractionBubble
                variant="request"
                text={request.text}
                fromMe={request.status !== 'pending'}
                isPending={request.status === 'pending'}
                tier={2}
                onAccept={() => handleRequestAccept(request.id)}
                onDecline={() => handleRequestDeny(request.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls Panel */}
      {modeState === 'idle' && (
        <div className="border-t border-amber-900/30 p-3 sm:p-4 space-y-3 bg-[#160d08]/90 backdrop-blur-md">
          {isController && (
            <>
              {/* Category Picker with 3-Tier Escalation */}
              <CategoryPicker onSelect={handleCategorySelect} />

              {/* Hold-to-Edge Stopwatch Control ([Q051]) */}
              <div className="relative">
                <button
                  onMouseDown={startEdgeHold}
                  onMouseUp={stopEdgeHold}
                  onTouchStart={startEdgeHold}
                  onTouchEnd={stopEdgeHold}
                  className={`w-full py-3 px-4 rounded-2xl border text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 select-none ${
                    isHoldingEdge
                      ? 'bg-amber-600 text-white border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.6)] scale-102 animate-pulse'
                      : 'bg-[#221711] border-amber-900/40 text-amber-300 hover:border-amber-600/60 hover:bg-[#2c1d15]'
                  }`}
                >
                  <TimerIcon className="w-4 h-4 text-amber-400" />
                  <span>
                    {isHoldingEdge ? `HOLDING EDGE: ${edgeSeconds.toFixed(1)}s` : 'HOLD TO COMMAND EDGE'}
                  </span>
                </button>
              </div>

              {/* Custom Command Input with Safeword check */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuest}
                  onChange={(e) => setCustomQuest(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCustomQuest()}
                  placeholder="Whisper custom command (or 'RED')..."
                  className="flex-1 px-3 py-2 bg-[#1c130d] border border-amber-900/35 rounded-xl text-xs text-[#f5ebe0] placeholder-[#8c7867] focus:outline-none focus:border-amber-600"
                />
                <button
                  onClick={handleSendCustomQuest}
                  disabled={!customQuest.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 text-white font-medium rounded-xl text-xs transition cursor-pointer"
                >
                  Command
                </button>
              </div>
            </>
          )}

          {!isController && (
            <div className="space-y-2">
              {/* Permission to Climax Request ([Q159]) */}
              <button
                onClick={handleRequestPermissionToClimax}
                className="w-full py-2.5 px-4 bg-[#241711] border border-amber-900/40 hover:border-amber-600 text-amber-200 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <HeartIcon className="w-4 h-4 text-amber-400" />
                <span>Request Permission to Climax</span>
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuest}
                  onChange={(e) => setCustomQuest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customQuest.trim()) {
                      if (checkSafeword(customQuest)) return
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
                  placeholder="Request something gently (or 'RED')..."
                  className="flex-1 px-3 py-2 bg-[#1c130d] border border-amber-900/35 rounded-xl text-xs text-[#f5ebe0] placeholder-[#8c7867] focus:outline-none focus:border-amber-600"
                />
                <button
                  onClick={() => {
                    if (customQuest.trim()) {
                      if (checkSafeword(customQuest)) return
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
                  className="px-4 py-2 bg-[#2a1a12] border border-amber-900/40 text-amber-300 hover:text-white rounded-xl text-xs font-medium disabled:opacity-40 transition cursor-pointer"
                >
                  Ask
                </button>
              </div>
            </div>
          )}

          {/* Action Triggers: Getting Close, I Came, Safeword Stop */}
          <div className="flex items-center gap-2 pt-1">
            {/* "I'm Getting Close" Ember Signal ([Q097]) */}
            <button
              onClick={handleSendGettingClose}
              disabled={closeSignalSent}
              className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 btn-press ${
                closeSignalSent
                  ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 animate-pulse'
                  : 'bg-[#261912] border border-amber-900/40 text-amber-400 hover:bg-[#342117] hover:border-amber-700/50'
              }`}
              title="Alert companion that you are nearing the edge"
            >
              <FireIcon2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{closeSignalSent ? "Signal Sent!" : "Getting Close"}</span>
            </button>

            {/* "I Came" Climax Trigger ([Q006], [Q087]) */}
            <button
              onClick={handleICame}
              disabled={pendingICame}
              className="flex-1 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold shadow-md shadow-amber-950/40 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5 btn-press"
            >
              <HeartIcon className="w-3.5 h-3.5 text-amber-200" />
              <span>I came</span>
            </button>

            {/* Safeword Emergency Stop ([Q009], [Q127]) */}
            <button
              onClick={() => handleSafetyExit('Emergency Safeword')}
              className="px-3 py-2.5 rounded-xl bg-[#20110c] border border-red-900/50 hover:bg-red-950/60 hover:border-red-600 text-red-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 btn-press"
              title="Safeword Stop & Cloak"
            >
              <StopIcon className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Safeword</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
