'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  CloseIcon,
  PlayIcon,
  PauseIcon,
  VolumeIcon,
  VolumeMuteIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  HeartIcon,
  BadgeCheckIcon,
} from '@/components/icons'
import { haptics } from '@/utils/haptics'
import { saveToVault, removeFromVault, isInVault } from '@/utils/vault'
import { useToast } from '@/components/ui/Toast'
import type { Clip } from '@/types/clips'

interface ClipsPlayerProps {
  clips: Clip[]
  startIndex: number
  onClose: () => void
  nicheName?: string | null
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

export default function ClipsPlayer({ clips, startIndex, onClose, nicheName }: ClipsPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const touchStartY = useRef<number | null>(null)
  const { toast } = useToast()

  const clip = clips[currentIndex]

  // Check Vault state on clip change
  useEffect(() => {
    if (!clip) return
    const checkSaved = async () => {
      const saved = await isInVault(clip.hash || clip.clipId)
      setIsSaved(saved)
    }
    checkSaved()
  }, [clip])

  // Play/pause control
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
      haptics.lightTap()
      setCurrentIndex((prev) => prev - 1)
      setPlaying(true)
    }
  }, [currentIndex])

  const goToNext = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      haptics.lightTap()
      setCurrentIndex((prev) => prev + 1)
      setPlaying(true)
    }
  }, [currentIndex, clips.length])

  // Touch Swipe navigation (TikTok vertical snap) [Q21]
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const deltaY = touchStartY.current - e.changedTouches[0].clientY

    if (deltaY > 50) {
      goToNext()
    } else if (deltaY < -50) {
      goToPrev()
    }
    touchStartY.current = null
  }

  // Wheel navigation on desktop
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 60) {
      goToNext()
    } else if (e.deltaY < -60) {
      goToPrev()
    }
  }

  const handleToggleVault = async () => {
    if (!clip) return
    const id = clip.hash || clip.clipId

    if (isSaved) {
      await removeFromVault(id)
      setIsSaved(false)
      toast({ title: 'Removed from Vault', variant: 'info' })
    } else {
      const ok = await saveToVault({
        id,
        title: clip.title,
        thumbnail: clip.thumbnail || '',
        streamUrl: clip.hdUrl || clip.sdUrl || '',
        site: 'redgifs',
        duration: clip.duration || undefined,
      })
      if (ok) {
        setIsSaved(true)
        toast({ title: 'Saved to Encrypted Vault', description: 'Available offline (up to 5 clips)', variant: 'success' })
      } else {
        toast({ title: 'Vault Full (Cap 5)', description: 'Evict older clips to save more', variant: 'alert' })
      }
    }
  }

  if (!clip) return null

  const videoSrc = clip.hdUrl || clip.sdUrl || clip.preview || ''

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0e0a07] select-none overflow-hidden flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Video Container (Full-Bleed Vertical Snap) */}
      <div className="relative w-full h-full max-w-lg mx-auto flex items-center justify-center overflow-hidden bg-black">
        <video
          ref={videoRef}
          key={clip.clipId}
          src={videoSrc}
          poster={clip.thumbnail || undefined}
          muted={muted}
          loop
          autoPlay
          playsInline
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => {
            haptics.lightTap()
            setPlaying(!playing)
          }}
        />

        {/* Ambient Top Shadow Bar */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#0e0a07]/80 via-[#0e0a07]/30 to-transparent pointer-events-none" />

        {/* Top Floating Header */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20">
          <button
            onClick={() => {
              haptics.cancel()
              onClose()
            }}
            className="p-2.5 rounded-full bg-[#160e0a]/80 border border-amber-900/40 text-[#f5ebe0] hover:text-white backdrop-blur-md cursor-pointer btn-press"
            title="Close Clips"
          >
            <CloseIcon className="w-5 h-5" />
          </button>

          {nicheName && (
            <span className="px-3 py-1 rounded-full bg-[#160e0a]/80 border border-amber-900/40 text-xs font-mono text-amber-300 backdrop-blur-md">
              #{nicheName}
            </span>
          )}

          <div className="text-xs font-mono text-[#a89582] bg-[#160e0a]/80 px-2.5 py-1 rounded-full border border-amber-900/40 backdrop-blur-md">
            {currentIndex + 1} / {clips.length}
          </div>
        </div>

        {/* Play/Pause Central Tap Indicator */}
        {!playing && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10 animate-scale-in"
          >
            <div className="w-16 h-16 rounded-full bg-[#160e0a]/90 border border-amber-500/50 flex items-center justify-center shadow-2xl">
              <PlayIcon className="w-8 h-8 text-amber-300 ml-1" />
            </div>
          </div>
        )}

        {/* Right Vertical Action Rail */}
        <div className="absolute right-3.5 bottom-28 flex flex-col items-center gap-4 z-20">
          {/* Vault Heart Save Button */}
          <button
            onClick={handleToggleVault}
            className={`p-3 rounded-full border backdrop-blur-xl transition-all btn-press cursor-pointer shadow-xl ${
              isSaved
                ? 'bg-amber-500 border-amber-400 text-black shadow-amber-500/40 scale-110'
                : 'bg-[#160e0a]/80 border-amber-900/40 text-[#f5ebe0] hover:text-amber-300'
            }`}
            title={isSaved ? 'In Vault' : 'Save to Vault'}
          >
            <HeartIcon className="w-5 h-5" />
          </button>

          {/* Mute / Unmute Button (Global Memory [Q133]) */}
          <button
            onClick={() => {
              haptics.lightTap()
              setMuted(!muted)
            }}
            className="p-3 rounded-full bg-[#160e0a]/80 border border-amber-900/40 text-[#f5ebe0] hover:text-amber-300 backdrop-blur-xl transition-all btn-press cursor-pointer shadow-xl"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeMuteIcon className="w-5 h-5 text-rose-300" /> : <VolumeIcon className="w-5 h-5 text-amber-300" />}
          </button>

          {/* Previous Clip Button */}
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="p-2.5 rounded-full bg-[#160e0a]/60 border border-amber-900/30 text-[#a89582] hover:text-white disabled:opacity-20 backdrop-blur-md cursor-pointer btn-press"
            title="Previous Clip"
          >
            <ChevronUpIcon className="w-5 h-5" />
          </button>

          {/* Next Clip Button */}
          <button
            onClick={goToNext}
            disabled={currentIndex === clips.length - 1}
            className="p-2.5 rounded-full bg-[#160e0a]/60 border border-amber-900/30 text-[#a89582] hover:text-white disabled:opacity-20 backdrop-blur-md cursor-pointer btn-press"
            title="Next Clip"
          >
            <ChevronDownIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Left Info Stack */}
        <div className="absolute bottom-6 inset-x-4 pr-16 z-20 pointer-events-none">
          {/* Creator Tag with Verification Badge */}
          {clip.username && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-semibold text-[#fef9f5] drop-shadow-md">
                @{clip.username}
              </span>
              {clip.verified && <BadgeCheckIcon className="w-3.5 h-3.5 text-amber-400" />}
            </div>
          )}

          {/* Clip Title */}
          {clip.title && (
            <h3 className="text-xs sm:text-sm font-medium text-[#f5ebe0] line-clamp-2 drop-shadow-md mb-2">
              {clip.title}
            </h3>
          )}

          {/* Meta Tags & Duration Pill */}
          <div className="flex flex-wrap items-center gap-1.5">
            {clip.duration && (
              <span className="px-2 py-0.5 rounded-md bg-[#160e0a]/85 border border-amber-900/40 text-[10px] font-mono text-amber-300">
                {formatDuration(clip.duration)}
              </span>
            )}
            {clip.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-[#160e0a]/60 text-[10px] text-[#a89582] border border-white/5"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
