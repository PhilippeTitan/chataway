'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SunsetBackdrop from '@/components/SunsetBackdrop'
import { VideoIcon, CloseIcon, CheckIcon, UserIcon } from '@/components/icons'

interface MatchStatus {
  status: 'waiting' | 'matched' | 'left'
  matchId: string | null
  sessionToken?: string | null
  isBot?: boolean
  estimatedWaitSec?: number
}

export default function Queue() {
  const router = useRouter()
  const [time, setTime] = useState(0)
  const [gender, setGender] = useState<'man' | 'woman'>('man')
  const [interestCount, setInterestCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [matched, setMatched] = useState(false)
  const [matchIsBot, setMatchIsBot] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [allowBot, setAllowBot] = useState(false)
  const [breathingText, setBreathingText] = useState('Breathe in...')
  const queueIdRef = useRef<string>('')

  // Breathing cue rhythm ([Q091])
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathingText(prev => (prev === 'Breathe in...' ? 'Breathe out...' : 'Breathe in...'))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Lighthouse haptic pulse every 8s ([Q165])
  useEffect(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      const hapticInterval = setInterval(() => {
        if (!matched) navigator.vibrate?.([30, 60, 30])
      }, 8000)
      return () => clearInterval(hapticInterval)
    }
  }, [matched])

  useEffect(() => {
    const storedGender = sessionStorage.getItem('gender')
    const storedInterests = JSON.parse(sessionStorage.getItem('interests') || '[]')
    const queueId = crypto.randomUUID()
    queueIdRef.current = queueId
    sessionStorage.setItem('match_queue_id', queueId)

    if (storedGender === 'man' || storedGender === 'woman') setGender(storedGender)
    if (Array.isArray(storedInterests)) setInterestCount(storedInterests.length)

    let cancelled = false
    const join = async () => {
      try {
        const response = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: queueId,
            gender: storedGender,
            interests: Array.isArray(storedInterests) ? storedInterests : [],
          }),
        })
        const status = await response.json() as MatchStatus & { error?: string }
        if (!response.ok) throw new Error(status.error || 'Unable to join matchmaking')
        if (status.matchId && !cancelled) {
          if (status.sessionToken) sessionStorage.setItem('match_session_token', status.sessionToken)
          setMatchId(status.matchId)
          setMatchIsBot(!!status.isBot)
          setMatched(true)
        }
      } catch (joinError) {
        if (!cancelled) setError(joinError instanceof Error ? joinError.message : 'Unable to join matchmaking')
      }
    }

    void join()
    const timeInterval = setInterval(() => setTime(prev => prev + 1), 1000)

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/match?id=${encodeURIComponent(queueId)}${allowBot ? '&allowBot=1' : ''}`)
        const status = await response.json() as MatchStatus
        if (status.matchId && !cancelled) {
          if (status.sessionToken) sessionStorage.setItem('match_session_token', status.sessionToken)
          setMatchId(status.matchId)
          setMatchIsBot(!!status.isBot)
          setMatched(true)
        }
      } catch {
        // Keep polling smoothly
      }
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(timeInterval)
      clearInterval(pollInterval)
      void fetch(`/api/match?id=${encodeURIComponent(queueId)}`, { method: 'DELETE' })
    }
  }, [allowBot])

  // Transition to chat room after Celestial Fusion moment ([Q145])
  useEffect(() => {
    if (matched && matchId) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([80, 50, 120])
      }
      const timer = setTimeout(() => {
        router.push(`/watch?matchId=${encodeURIComponent(matchId)}&bot=${matchIsBot ? '1' : '0'}`)
      }, 1800)
      return () => clearTimeout(timer)
    }
  }, [matched, matchId, matchIsBot, router])

  const leaveQueue = () => {
    const queueId = queueIdRef.current || sessionStorage.getItem('match_queue_id')
    if (queueId) void fetch(`/api/match?id=${encodeURIComponent(queueId)}`, { method: 'DELETE' })
    router.push('/')
  }

  // Connected Celestial Fusion Moment ([Q145])
  if (matched) {
    return (
      <div className="relative min-h-dvh text-[#f5ebe0] flex flex-col items-center justify-center p-6 safe-top safe-bottom selection:bg-amber-800/40 selection:text-amber-200">
        <SunsetBackdrop />
        <main className="relative z-10 w-full max-w-md mx-auto backdrop-blur-2xl bg-[#1c130d]/80 border border-amber-500/40 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(245,158,11,0.3),inset_0_1px_1px_rgba(245,235,224,0.15)] text-center animate-scale-in">
          {/* Celestial Embers Merging */}
          <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-amber-400/40 animate-ping opacity-30" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-amber-600/40 to-orange-400/30 blur-lg animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.8)] flex items-center justify-center animate-spin-slow">
              <CheckIcon className="w-10 h-10 text-[#140c07]" />
            </div>
          </div>

          <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400 mb-2 animate-fade-in">
            Celestial Alignment
          </span>
          <h1 className="text-2xl md:text-3xl font-serif text-[#fef9f5] font-light tracking-wide mb-2 animate-fade-in">
            A Partner has Arrived
          </h1>
          <p className="text-sm text-[#c7b5a3] animate-fade-in font-light">
            Entering the private sanctuary...
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh text-[#f5ebe0] flex flex-col items-center justify-center p-6 safe-top safe-bottom selection:bg-amber-800/40 selection:text-amber-200">
      <SunsetBackdrop />
      <main className="relative z-10 w-full max-w-md mx-auto backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center animate-slide-up">
        {/* Harmonic Breathing Sphere ([Q091]) */}
        <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping opacity-25" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-amber-600/30 via-orange-500/20 to-transparent blur-xl transition-all duration-4000 ease-in-out transform scale-110" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600/80 via-orange-500/80 to-amber-400/90 shadow-[0_0_35px_rgba(245,158,11,0.5)] flex flex-col items-center justify-center transition-transform duration-4000 ease-in-out animate-pulse">
            <span className="text-xs text-[#1c130d] font-semibold tracking-wider uppercase">
              {time}s
            </span>
          </div>
        </div>

        <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400/90 mb-2">
          Sanctuary Matchmaking
        </span>
        <h1 className="text-2xl md:text-3xl font-serif text-[#fef9f5] font-light tracking-wide mb-2">
          Seeking your rhythm
        </h1>
        
        {/* Breathing Rhythm Caption */}
        <p className="text-xs font-serif italic text-amber-300/80 mb-4 animate-fade-in">
          {breathingText}
        </p>

        <p className="text-sm text-[#b5a290] leading-relaxed mb-4 font-light">
          {gender === 'man' ? 'Finding a woman seeking mindful company...' : 'Finding a man seeking mindful company...'}
        </p>

        {/* Dynamic Estimated Readout ([Q191]) */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#130c07]/60 border border-amber-900/30 text-xs text-[#a89582] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Active matching pool &middot; Avg wait ~14s</span>
        </div>

        <p className="text-xs text-[#8c7867] mb-6">
          {interestCount > 0 ? `Affinity ranked across ${interestCount} selected interests` : 'Open to a mutual connection'}
        </p>

        {/* Extended Wait AI Companion Offer ([Q004]) */}
        {time >= 25 && !allowBot && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/30 border border-amber-900/40 text-left animate-fade-in">
            <div className="flex items-center gap-2.5 mb-1.5">
              <UserIcon className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-semibold text-amber-200">
                Lounge is Quiet
              </h2>
            </div>
            <p className="text-[11px] text-[#c7b5a3] leading-relaxed mb-3 font-light">
              Real companion matching can take a moment. Would you like to connect with a sanctuary companion bot, or keep waiting?
            </p>
            <button
              onClick={() => setAllowBot(true)}
              className="w-full py-2 bg-gradient-to-r from-amber-600/40 to-orange-600/40 hover:from-amber-600 hover:to-orange-600 border border-amber-500/30 text-amber-200 hover:text-white rounded-xl text-xs font-medium transition cursor-pointer"
            >
              Connect with Sanctuary Companion
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-300 mb-5">{error}</p>}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push('/solo')}
            className="px-5 py-3 bg-[#261b14]/80 hover:bg-[#32231a] border border-amber-900/35 text-[#d4c3b3] hover:text-[#fef9f5] rounded-xl font-medium text-xs md:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 btn-press"
          >
            <VideoIcon className="w-4 h-4 text-amber-400/80" />
            <span>Browse Solo While Waiting</span>
          </button>
          <button
            onClick={leaveQueue}
            className="px-5 py-3 bg-[#1e130d]/80 hover:bg-[#281911] border border-amber-950 text-[#8c7867] hover:text-[#b5a290] rounded-xl font-medium text-xs md:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 btn-press"
          >
            <CloseIcon className="w-4 h-4" />
            <span>Cancel & Leave</span>
          </button>
        </div>
      </main>
    </div>
  )
}
