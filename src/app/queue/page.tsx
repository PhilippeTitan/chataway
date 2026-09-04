'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SunsetBackdrop from '@/components/SunsetBackdrop'
import { VideoIcon, CloseIcon, CheckIcon } from '@/components/icons'

interface MatchStatus {
  status: 'waiting' | 'matched' | 'left'
  matchId: string | null
  isBot?: boolean
}

export default function Queue() {
  const router = useRouter()
  const [dots, setDots] = useState('')
  const [time, setTime] = useState(0)
  const [gender, setGender] = useState<'man' | 'woman'>('man')
  const [interestCount, setInterestCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [matched, setMatched] = useState(false)
  const [matchIsBot, setMatchIsBot] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)

  useEffect(() => {
    const storedGender = sessionStorage.getItem('gender')
    const storedInterests = JSON.parse(sessionStorage.getItem('interests') || '[]')
    const queueId = crypto.randomUUID()
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
          setMatchId(status.matchId)
          setMatchIsBot(!!status.isBot)
          setMatched(true)
        }
      } catch (joinError) {
        if (!cancelled) setError(joinError instanceof Error ? joinError.message : 'Unable to join matchmaking')
      }
    }

    void join()
    const dotInterval = setInterval(() => setDots(prev => (prev.length >= 3 ? '' : prev + '.')), 500)
    const timeInterval = setInterval(() => setTime(prev => prev + 1), 1000)
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/match?id=${encodeURIComponent(queueId)}`)
        const status = await response.json() as MatchStatus
        if (status.matchId && !cancelled) {
          setMatchId(status.matchId)
          setMatchIsBot(!!status.isBot)
          setMatched(true)
        }
      } catch {
        // Keep polling while the queue remains visible.
      }
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(dotInterval)
      clearInterval(timeInterval)
      clearInterval(pollInterval)
      void fetch(`/api/match?id=${encodeURIComponent(queueId)}`, { method: 'DELETE' })
    }
  }, [router])

  // Transition to chat after "Connected!" moment
  useEffect(() => {
    if (matched && matchId) {
      const timer = setTimeout(() => {
        router.push(`/chat?matchId=${encodeURIComponent(matchId)}&bot=${matchIsBot ? '1' : '0'}`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [matched, matchId, matchIsBot, router])

  const leaveQueue = () => {
    const queueId = sessionStorage.getItem('match_queue_id')
    if (queueId) void fetch(`/api/match?id=${encodeURIComponent(queueId)}`, { method: 'DELETE' })
    router.push('/')
  }

  // Connected overlay
  if (matched) {
    return (
      <div className="relative min-h-dvh text-[#f5ebe0] flex flex-col items-center justify-center p-6 safe-top safe-bottom selection:bg-amber-800/40 selection:text-amber-200">
        <SunsetBackdrop />
        <main className="relative z-10 w-full max-w-md mx-auto backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center animate-scale-in">
          <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping opacity-20" />
            <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-emerald-600/30 to-emerald-400/20 blur-md animate-pulse" />
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.6)] flex items-center justify-center">
              <CheckIcon className="w-8 h-8 text-[#0e0a07]" />
            </div>
          </div>

          <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-emerald-400/90 mb-2 animate-fade-in">
            Connected
          </span>
          <h1 className="text-2xl md:text-3xl font-serif text-[#fef9f5] font-light tracking-wide mb-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
            You found each other
          </h1>
          <p className="text-sm text-[#b5a290] animate-fade-in" style={{ animationDelay: '200ms' }}>
            Opening your room...
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh text-[#f5ebe0] flex flex-col items-center justify-center p-6 safe-top safe-bottom selection:bg-amber-800/40 selection:text-amber-200">
      <SunsetBackdrop />
      <main className="relative z-10 w-full max-w-md mx-auto backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center animate-slide-up">
        <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping opacity-30" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-amber-600/30 to-orange-500/20 blur-md animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.6)] flex items-center justify-center">
            <span className="text-2xl text-[#1a110a] font-serif">{dots || '\u00B7'}</span>
          </div>
        </div>

        <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400/90 mb-2">
          Matchmaking Sanctuary
        </span>
        <h1 className="text-2xl md:text-3xl font-serif text-[#fef9f5] font-light tracking-wide mb-2">
          Looking for your wavelength{dots}
        </h1>
        <p className="text-sm text-[#b5a290] leading-relaxed mb-6 font-light">
          {gender === 'man' ? 'Finding a woman seeking mindful company...' : 'Finding a man seeking mindful company...'}
        </p>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#130c07]/60 border border-amber-900/30 text-xs text-[#a89582] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-dot" />
          <span>Searching &middot; {time}s</span>
        </div>
        <p className="text-xs text-[#8c7867] mb-8">
          {interestCount > 0 ? `Matching around ${interestCount} selected ${interestCount === 1 ? 'interest' : 'interests'}` : 'Open to a shared rhythm'}
        </p>

        {error && <p className="text-sm text-red-300 mb-5">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push('/solo')}
            className="px-5 py-3 bg-[#261b14]/80 hover:bg-[#32231a] border border-amber-900/35 text-[#d4c3b3] hover:text-[#fef9f5] rounded-xl font-medium text-xs md:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 btn-press"
          >
            <VideoIcon className="w-4 h-4 text-amber-400/80" />
            <span>Watch Solo In Lounge</span>
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
