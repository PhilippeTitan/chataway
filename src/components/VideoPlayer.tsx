'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Hls from 'hls.js'
import { PlayIcon, PauseIcon, VolumeIcon, BackIcon } from '@/components/icons'

interface VideoPlayerProps {
  streamUrl: string
  thumbnail: string
  title: string
  duration?: string
  onBack: () => void
  formats?: { format_id: string; url: string; ext: string; width: number; height: number }[]
  mode?: 'solo' | 'together'
  canControl?: boolean
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
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [volume, setVolume] = useState(80)
  const [ambienceVolume, setAmbienceVolume] = useState(0)
  const [brightness, setBrightness] = useState(100)
  const [showBrightnessToast, setShowBrightnessToast] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [selectedQuality, setSelectedQuality] = useState<string>('default')
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

  // Track whether Web Audio has been connected to prevent double-connecting
  const audioConnectedRef = useRef(false)

  // Video Stream loading, HLS handling & Web Audio Peak Limiter ([Q107])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null
    let audioCtx: AudioContext | null = null
    const isHls = streamUrl.includes('.m3u8')

    if (isHls && Hls.isSupported()) {
      hls = new Hls({
        capLevelToPlayerSize: true,
      })
      hls.loadSource(proxyUrl)
      hls.attachMedia(video)
    } else {
      video.src = proxyUrl
    }

    // Attach Web Audio peak limiter once source is assigned
    if (!audioConnectedRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
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
      } catch {
        // Fallback if AudioContext is blocked or already connected
      }
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

    if (video.paused) {
      void video.play().catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Video playback failed:', error)
        }
      })
    } else {
      video.pause()
    }
  }, [canControl])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canControl) return
    const video = videoRef.current
    if (!video || !video.duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    video.currentTime = percentage * video.duration
  }, [canControl])

  const handleProgressMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !video.duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percentage = x / rect.width
    setHoverX(x)
    setHoverTime(formatTime(percentage * video.duration))
  }, [])

  const handleProgressMouseLeave = useCallback(() => {
    setHoverTime(null)
  }, [])

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3500)
  }, [isPlaying])

  const handleVideoClick = useCallback(() => {
    setShowControls(true)
    togglePlay()
  }, [togglePlay])

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
      setBrightness(prev => {
        const next = Math.max(25, Math.min(100, prev + change))
        return next
      })
      setShowBrightnessToast(true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setShowBrightnessToast(false), 1500)
      touchStartY.current = touch.clientY
    }
  }

  const handleTouchEnd = () => {
    touchStartY.current = 0
  }

  return (
    <div
      ref={containerRef}
      className={`${mode === 'together' ? 'relative w-full h-full min-h-0' : 'fixed inset-0 z-50 min-h-dvh'} bg-[#0e0a07] flex flex-col overflow-hidden select-none`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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

      {/* Back button */}
      <button
        onClick={onBack}
        className={`absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 z-50 px-4 py-2 bg-[#1c130d]/70 border border-amber-900/35 backdrop-blur-md rounded-xl text-xs md:text-sm text-[#f5ebe0] hover:bg-[#251a13] transition cursor-pointer flex items-center gap-2 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <BackIcon className="w-4 h-4 text-amber-400" />
        <span>Back</span>
      </button>

      {/* Video Canvas Container */}
      <div 
        className={`flex-1 flex items-center justify-center relative ${canControl ? 'cursor-pointer' : 'cursor-default'}`} 
        onClick={handleVideoClick}
      >
        <video
          ref={videoRef}
          poster={thumbnail}
          crossOrigin="anonymous"
          className="w-full h-full max-w-full max-h-full object-contain cursor-pointer transition-[filter] duration-150"
          style={{ filter: `brightness(${brightness}%)` }}
          playsInline
          controls={false}
        />
      </div>

      {/* Controls HUD */}
      <div
        onClick={(event) => event.stopPropagation()}
        className={`pb-[calc(0.75rem+env(safe-area-inset-bottom))] px-3 pt-3 sm:px-6 sm:pt-4 bg-gradient-to-t from-[#0e0a07] via-[#0e0a07]/80 to-transparent transition-opacity duration-300 z-40 ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[#fef9f5] text-xs sm:text-sm font-serif italic truncate drop-shadow-md">
              {title}
            </h3>
            {!canControl && (
              <span className="text-[10px] text-amber-400/80 bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded-full font-sans not-italic">
                Partner has remote
              </span>
            )}
          </div>

          {/* Timeline Action Heatmap Curve ([Q100]) */}
          <div className="relative w-full h-2.5 mb-1 pointer-events-none">
            <svg className="w-full h-full opacity-50" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path d="M0,20 Q15,18 25,12 T50,7 T75,2 T90,9 T100,20 L100,20 L0,20 Z" fill="url(#heatGradient)" />
              <defs>
                <linearGradient id="heatGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="0.6" />
                  <stop offset="78%" stopColor="#ea580c" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Scrubber Progress bar with Hover Tooltip ([Q029]) */}
          <div
            className={`relative w-full h-2 bg-amber-950/40 border border-amber-900/30 rounded-full mb-3 group ${canControl ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
            onClick={handleProgressClick}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={handleProgressMouseLeave}
          >
            {/* Hover Tooltip Timestamp */}
            {hoverTime && (
              <div 
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-[#1c130d] border border-amber-500/50 text-[10px] font-mono text-amber-200 pointer-events-none shadow-md"
                style={{ left: `${hoverX}px` }}
              >
                {hoverTime}
              </div>
            )}

            <div
              className="h-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-amber-300 border-2 border-[#1c130d] rounded-full shadow-md scale-100 group-hover:scale-125 transition-transform" />
            </div>
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                disabled={!canControl}
                className="text-[#f5ebe0] hover:text-amber-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed btn-press"
                title={canControl ? 'Play or pause' : 'Control is with your partner'}
              >
                {isPlaying ? <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>

              {/* Time */}
              <span className="text-xs sm:text-sm text-[#a89582] tabular-nums font-mono">
                {currentTime} / {duration || '--:--'}
              </span>

              {/* Video Audio Slider (Independent per Q018) */}
              <div className="flex items-center gap-2 group/volume">
                <VolumeIcon className="w-4 h-4 text-amber-400/80" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setVolume(val)
                    if (videoRef.current) {
                      videoRef.current.volume = val / 100
                    }
                  }}
                  className="w-16 sm:w-20 cursor-pointer accent-amber-500 opacity-80 hover:opacity-100 transition"
                  title="Video audio (independent)"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Quality selector */}
              {formats && formats.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="px-2.5 py-1 bg-[#1c130d] border border-amber-900/40 rounded-lg text-[10px] text-amber-300 hover:bg-[#251a13] cursor-pointer"
                  >
                    {selectedQuality === 'default' ? '360p' : selectedQuality}
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-[#1c130d] rounded-xl border border-amber-900/40 overflow-hidden shadow-xl z-50">
                      <button
                        onClick={() => {
                          setSelectedQuality('default')
                          setShowQualityMenu(false)
                        }}
                        className="block w-full px-4 py-2 text-xs text-left text-[#d4c3b3] hover:bg-[#251a13] hover:text-white cursor-pointer"
                      >
                        Default (360p)
                      </button>
                      {formats.map((f) => (
                        <button
                          key={f.format_id}
                          onClick={() => {
                            setSelectedQuality(`${f.height}p`)
                            setShowQualityMenu(false)
                          }}
                          className="block w-full px-4 py-2 text-xs text-left text-[#d4c3b3] hover:bg-[#251a13] hover:text-white cursor-pointer"
                        >
                          {f.height}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
