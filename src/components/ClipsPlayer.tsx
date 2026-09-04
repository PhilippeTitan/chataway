'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { CloseIcon, PlayIcon, PauseIcon, VolumeIcon, ChevronUpIcon, ChevronDownIcon, HeartIcon, EyeIcon, BadgeCheckIcon } from '@/components/icons'
import type { Clip } from '@/types/clips'

interface ClipsPlayerProps {
  clips: Clip[]
  startIndex: number
  onClose: () => void
}

function formatCount(n: number | null): string {
  if (n === null || n === undefined) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ClipsPlayer({ clips, startIndex, onClose }: ClipsPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<number | null>(null)

  const clip = clips[currentIndex]

  useEffect(() => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [playing, currentIndex])

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setPlaying(true)
    }
  }, [currentIndex])

  const goToNext = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setPlaying(true)
    }
  }, [currentIndex, clips.length])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'w') goToPrev()
    else if (e.key === 'ArrowDown' || e.key === 's') goToNext()
    else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p) }
    else if (e.key === 'Escape') onClose()
    else if (e.key === 'm') setMuted(m => !m)
  }, [goToPrev, goToNext, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return
    const delta = touchStart.current - e.changedTouches[0].clientY
    if (Math.abs(delta) > 50) {
      if (delta > 0) goToNext()
      else goToPrev()
    }
    touchStart.current = null
  }

  if (!clip) return null

  const videoUrl = clip.hdUrl || clip.sdUrl

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          {/* User avatar */}
          <div className="w-9 h-9 rounded-full bg-[#2a1f16] border border-amber-900/40 flex items-center justify-center">
            <span className="text-xs font-bold text-amber-400/80 uppercase">
              {clip.username ? clip.username.slice(0, 2) : '??'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white">{clip.username || 'Unknown'}</span>
              {clip.verified && <BadgeCheckIcon className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            {clip.title && (
              <p className="text-[11px] text-white/60 line-clamp-1 max-w-[200px]">{clip.title}</p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition cursor-pointer"
        >
          <CloseIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Video */}
      <div className="relative w-full h-full flex items-center justify-center">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="h-full w-auto max-w-full object-contain"
            loop
            playsInline
            muted={muted}
            onClick={() => setPlaying(p => !p)}
          />
        ) : (
          <div className="text-center text-white/40">
            <PlayIcon className="w-16 h-16 mx-auto mb-3" />
            <p className="text-sm">No video available</p>
          </div>
        )}

        {/* Center play/pause indicator */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-in">
            <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
              <PlayIcon className="w-10 h-10 text-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goToPrev}
        disabled={currentIndex === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 disabled:opacity-30 transition cursor-pointer"
      >
        <ChevronUpIcon className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={goToNext}
        disabled={currentIndex === clips.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 disabled:opacity-30 transition cursor-pointer"
      >
        <ChevronDownIcon className="w-6 h-6 text-white" />
      </button>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          {/* Stats */}
          <div className="flex items-center gap-4">
            {clip.views && (
              <div className="flex items-center gap-1 text-xs text-white/70">
                <EyeIcon className="w-4 h-4" />
                <span className="tabular-nums">{formatCount(clip.views)}</span>
              </div>
            )}
            {clip.likes && (
              <div className="flex items-center gap-1 text-xs text-white/70">
                <HeartIcon className="w-4 h-4" />
                <span className="tabular-nums">{formatCount(clip.likes)}</span>
              </div>
            )}
            {clip.duration && (
              <div className="text-xs text-white/50 tabular-nums">
                {formatDuration(clip.duration)}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMuted(m => !m)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              <VolumeIcon className={`w-4 h-4 ${muted ? 'text-red-400' : 'text-white'}`} />
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {clips.slice(
            Math.max(0, currentIndex - 5),
            Math.min(clips.length, currentIndex + 6)
          ).map((_, i) => {
            const realIndex = Math.max(0, currentIndex - 5) + i
            return (
              <div
                key={realIndex}
                className={`rounded-full transition-all duration-300 ${
                  realIndex === currentIndex
                    ? 'w-6 h-1.5 bg-amber-400'
                    : 'w-1.5 h-1.5 bg-white/30'
                }`}
              />
            )
          })}
        </div>

        {/* Counter */}
        <p className="text-center text-[11px] text-white/40 mt-2 tabular-nums">
          {currentIndex + 1} / {clips.length}
        </p>
      </div>
    </div>
  )
}
