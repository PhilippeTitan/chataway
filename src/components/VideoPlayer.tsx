'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Hls from 'hls.js'
import { PlayIcon, PauseIcon, VolumeIcon, BackIcon } from '@/components/icons'
import { haptics } from '@/utils/haptics'

interface VideoPlayerProps {
  streamUrl: string
  thumbnail: string
  title: string
  duration?: string
  onBack: () => void
  formats?: { format_id: string; url: string; ext: string; width: number; height: number }[]
  mode?: 'solo' | 'together' | 'embedded'
  canControl?: boolean
  extracting?: boolean
}

export default function VideoPlayer({
  streamUrl,
  thumbnail,
  title,
  duration,
  onBack,
  formats,
  mode = 'solo',
  canControl = true,
  extracting = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [volume, setVolume] = useState(80)
  const [brightness, setBrightness] = useState(100)
  const [showBrightnessToast, setShowBrightnessToast] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [selectedQuality, setSelectedQuality] = useState<string>('auto')
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [hoverTime, setHoverTime] = useState<string | null>(null)
  const [hoverX, setHoverX] = useState<number>(0)
  const controlsTimer = useRef<NodeJS.Timeout | null>(null)
  const toastTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartY = useRef<number>(0)

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Web Audio Peak Limiter & Equalizer Setup ([Q107])
  const audioConnectedRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null
    let audioCtx: AudioContext | null = null
    const isHls = streamUrl.includes('.m3u8')

    if (isHls && Hls.isSupported()) {
      hls = new Hls({ capLevelToPlayerSize: true })
      hls.loadSource(proxyUrl)
      hls.attachMedia(video)
    } else {
      video.src = proxyUrl
    }

    if (!audioConnectedRef.current) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioCtx = new AudioContextClass()
        const source = audioCtx.createMediaElementSource(video)

        const compressor = audioCtx.createDynamicsCompressor()
        compressor.threshold.setValueAtTime(-24, audioCtx.currentTime)
        compressor.knee.setValueAtTime(30, audioCtx.currentTime)
        compressor.ratio.setValueAtTime(12, audioCtx.currentTime)
        compressor.attack.setValueAtTime(0.003, audioCtx.currentTime)
        compressor.release.setValueAtTime(0.25, audioCtx.currentTime)

        source.connect(compressor)
        compressor.connect(audioCtx.destination)
        audioConnectedRef.current = true
      } catch {}
    }

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100)
        setCurrentTime(formatTime(video.currentTime))
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      hls?.destroy()
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      if (audioCtx && audioCtx.state !== 'closed') {
        void audioCtx.close()
        audioConnectedRef.current = false
      }
    }
  }, [proxyUrl, streamUrl])

  const togglePlay = useCallback(() => {
    if (!canControl) return
    const video = videoRef.current
    if (!video) return

    haptics.lightTap()
    if (video.paused) {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [canControl])

  const skipSeconds = useCallback(
    (seconds: number) => {
      if (!canControl) return
      const video = videoRef.current
      if (!video) return
      haptics.lightTap()
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
    },
    [canControl]
  )

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canControl) return
      const video = videoRef.current
      if (!video || !video.duration) return

      haptics.confirm()
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      video.currentTime = percentage * video.duration
    },
    [canControl]
  )

  const handleProgressMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !video.duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percentage = x / rect.width
    setHoverX(x)
    setHoverTime(formatTime(percentage * video.duration))
  }, [])

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3500)
  }, [isPlaying])

  // Left-edge vertical swipe for brightness ([Q188])
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch && touch.clientX < window.innerWidth * 0.25) {
      touchStartY.current = touch.clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch && touchStartY.current > 0) {
      const deltaY = touchStartY.current - touch.clientY
      const change = Math.round(deltaY / 2)
      setBrightness((prev) => Math.max(25, Math.min(100, prev + change)))
      setShowBrightnessToast(true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setShowBrightnessToast(false), 1500)
      touchStartY.current = touch.clientY
    }
  }

  return (
    <div
      ref={containerRef}
      className={`${
        mode === 'together'
          ? 'relative w-full h-full min-h-0'
          : mode === 'embedded'
            ? 'relative w-full rounded-2xl overflow-hidden'
            : 'fixed inset-0 z-50 min-h-dvh'
      } bg-[#0e0a07] flex flex-col overflow-hidden select-none`}
      style={mode === 'embedded' ? { aspectRatio: '16/9' } : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => (touchStartY.current = 0)}
    >
      {/* Extracting Overlay — shown before stream is ready */}
      {extracting && (
        <div className="absolute inset-0 z-50 bg-[#0e0a07] flex flex-col items-center justify-center gap-4">
          {thumbnail && (
            <img
              src={thumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md"
            />
          )}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-amber-900/40" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-500 animate-spin" />
            </div>
            <p className="text-sm font-serif italic text-amber-200 animate-pulse">Connecting stream…</p>
            <p className="text-[11px] text-[#a89582]">This may take a few seconds</p>
          </div>
        </div>
      )}
      {/* Dynamic Ambilight Glow ([Q158]) */}
      <div
        className="absolute -inset-10 bg-gradient-to-tr from-amber-600/15 via-orange-600/10 to-transparent blur-3xl pointer-events-none rounded-3xl transition-opacity duration-1000"
        style={{ opacity: isPlaying ? 0.75 : 0.2 }}
      />

      {/* Brightness Toast ([Q188]) */}
      {showBrightnessToast && (
        <div className="absolute top-16 left-6 z-50 px-3.5 py-1.5 rounded-full bg-[#1c130d]/85 border border-amber-900/40 text-xs text-amber-200 backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span>Brightness</span>
          <span className="font-semibold">{brightness}%</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div
        className={`absolute top-0 inset-x-0 z-40 p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-between bg-gradient-to-b from-[#0e0a07]/80 via-[#0e0a07]/40 to-transparent transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={onBack}
          className="pointer-events-auto px-3.5 py-2 rounded-xl bg-[#1c130d]/80 border border-amber-900/40 text-xs sm:text-sm text-[#f5ebe0] hover:bg-[#261b14] transition cursor-pointer flex items-center gap-2 backdrop-blur-md btn-press"
        >
          <BackIcon className="w-4 h-4 text-amber-400" />
          <span>Back</span>
        </button>

        <div className="max-w-md mx-4 truncate pointer-events-auto text-center hidden sm:block">
          <h3 className="text-xs sm:text-sm font-serif italic text-[#fef9f5] truncate drop-shadow-md">
            {title}
          </h3>
          {!canControl && (
            <span className="inline-block mt-0.5 text-[10px] text-amber-400/90 font-mono">
              Partner holding remote
            </span>
          )}
        </div>

        {/* Quality Resolution Pill [Q37] */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            className="px-2.5 py-1 rounded-lg bg-[#1c130d]/80 border border-amber-900/40 text-[11px] font-mono text-amber-300 hover:bg-[#261b14] cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
          >
            <span>HD</span>
            <span className="text-[10px] text-[#a89582]">{selectedQuality === 'auto' ? 'Auto' : selectedQuality}</span>
          </button>

          {showQualityMenu && (
            <div className="absolute right-0 top-full mt-2 w-32 bg-[#1c130d]/95 border border-amber-900/40 rounded-xl p-1 shadow-2xl backdrop-blur-xl z-50 animate-slide-up">
              <button
                onClick={() => {
                  setSelectedQuality('auto')
                  setShowQualityMenu(false)
                }}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition ${
                  selectedQuality === 'auto' ? 'bg-amber-600 text-white' : 'text-[#a89582] hover:text-[#f5ebe0]'
                }`}
              >
                Auto (Best)
              </button>
              {formats?.map((f) => (
                <button
                  key={f.format_id}
                  onClick={() => {
                    setSelectedQuality(`${f.height}p`)
                    setShowQualityMenu(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition ${
                    selectedQuality === `${f.height}p`
                      ? 'bg-amber-600 text-white'
                      : 'text-[#a89582] hover:text-[#f5ebe0]'
                  }`}
                >
                  {f.height}p
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Canvas Container */}
      <div
        className={`flex-1 flex items-center justify-center relative ${
          canControl ? 'cursor-pointer' : 'cursor-default'
        }`}
        onClick={() => {
          setShowControls(true)
          togglePlay()
        }}
      >
        <video
          ref={videoRef}
          poster={thumbnail}
          crossOrigin="anonymous"
          className={`w-full h-full max-w-full max-h-full cursor-pointer transition-[filter] duration-150 ${
            mode === 'embedded' ? 'object-cover' : 'object-contain'
          }`}
          style={{ filter: `brightness(${brightness}%)` }}
          playsInline
          controls={false}
        />
      </div>

      {/* Floating Glass Capsule Transport HUD [Q20] */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[32rem] z-40 transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-[#160e0a]/90 backdrop-blur-2xl border border-amber-900/40 rounded-3xl p-3.5 shadow-2xl shadow-black/80">
          {/* Integrated Action Heatmap Curve & Luminous Scrubber Line [Q100, Q20] */}
          <div className="relative w-full mb-3">
            {/* Action Heatmap Curve SVG Overlay */}
            <div className="w-full h-2 mb-0.5 pointer-events-none opacity-60">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                <path d="M0,20 Q15,16 25,10 T50,5 T75,2 T90,8 T100,20 L100,20 L0,20 Z" fill="url(#heatGrad)" />
                <defs>
                  <linearGradient id="heatGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d97706" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#ea580c" stopOpacity="0.7" />
                    <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Scrubber Progress Bar */}
            <div
              className={`relative w-full h-2 bg-amber-950/50 rounded-full cursor-pointer group ${
                !canControl && 'cursor-not-allowed opacity-60'
              }`}
              onClick={handleProgressClick}
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={() => setHoverTime(null)}
            >
              {hoverTime && (
                <div
                  className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#160e0a] border border-amber-500/60 text-[10px] font-mono text-amber-200 pointer-events-none shadow-lg"
                  style={{ left: `${hoverX}px` }}
                >
                  {hoverTime}
                </div>
              )}

              <div
                className="h-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-amber-300 border-2 border-[#160e0a] shadow-md scale-100 group-hover:scale-125 transition-transform" />
              </div>
            </div>
          </div>

          {/* Centered Transport Capsule Buttons */}
          <div className="flex items-center justify-between gap-3">
            {/* Rewind 10s */}
            <button
              onClick={() => skipSeconds(-10)}
              disabled={!canControl}
              className="p-2 rounded-xl text-[#a89582] hover:text-[#f5ebe0] disabled:opacity-40 cursor-pointer btn-press"
              title="Rewind 10s"
            >
              <span className="text-xs font-mono font-bold">↺ 10</span>
            </button>

            {/* Play / Pause Primary CTA */}
            <button
              onClick={togglePlay}
              disabled={!canControl}
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-950/60 disabled:opacity-40 cursor-pointer btn-press"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6 ml-0.5" />}
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => skipSeconds(10)}
              disabled={!canControl}
              className="p-2 rounded-xl text-[#a89582] hover:text-[#f5ebe0] disabled:opacity-40 cursor-pointer btn-press"
              title="Forward 10s"
            >
              <span className="text-xs font-mono font-bold">10 ↻</span>
            </button>

            {/* Timestamps */}
            <div className="text-[11px] font-mono text-[#a89582] tabular-nums">
              {currentTime} / {duration || '--:--'}
            </div>

            {/* Independent Volume Slider [Q018] */}
            <div className="flex items-center gap-1.5">
              <VolumeIcon className="w-4 h-4 text-amber-400/80" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setVolume(val)
                  if (videoRef.current) videoRef.current.volume = val / 100
                }}
                className="w-16 cursor-pointer accent-amber-500 opacity-80 hover:opacity-100"
                title="Local Volume"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
