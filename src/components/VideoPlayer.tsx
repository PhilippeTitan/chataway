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

export default function VideoPlayer({ streamUrl, thumbnail, title, duration, onBack, formats, mode = 'solo', canControl = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [volume, setVolume] = useState(80)
  const [showControls, setShowControls] = useState(true)
  const [selectedQuality, setSelectedQuality] = useState<string>('default')
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const controlsTimer = useRef<NodeJS.Timeout | null>(null)

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null
    const isHls = streamUrl.includes('.m3u8')

    if (isHls && Hls.isSupported()) {
      hls = new Hls()
      hls.loadSource(proxyUrl)
      hls.attachMedia(video)
    } else {
      video.src = proxyUrl
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

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current)
    }
    controlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }, [isPlaying])

  const handleVideoClick = useCallback(() => {
    setShowControls(true)
    togglePlay()
  }, [togglePlay])

  useEffect(() => {
    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`${mode === 'together' ? 'relative w-full h-full min-h-0' : 'fixed inset-0 z-50 min-h-dvh'} bg-black flex flex-col`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className={`absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 z-50 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition cursor-pointer flex items-center gap-2 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <BackIcon className="w-5 h-5" /> Back
      </button>

      {/* Video */}
      <div className={`flex-1 flex items-center justify-center ${canControl ? 'cursor-pointer' : 'cursor-default'}`} onClick={handleVideoClick}>
        <video
          ref={videoRef}
          src={proxyUrl}
          poster={thumbnail}
          className="w-full h-full max-w-full max-h-full object-contain cursor-pointer"
          playsInline
          controls={false}
        />
      </div>

      {/* Controls */}
      <div
        onClick={(event) => event.stopPropagation()}
        className={`pb-[calc(0.75rem+env(safe-area-inset-bottom))] px-3 pt-3 sm:px-4 sm:pt-4 bg-gradient-to-t from-black via-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <h3 className="text-white text-sm sm:text-base font-semibold truncate mb-2 drop-shadow-md">{title}</h3>

          {/* Progress bar */}
          <div
            className={`w-full h-1 bg-gray-600/80 rounded-full mb-3 group ${canControl ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-white rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Play/Pause */}
                <button onClick={togglePlay} disabled={!canControl} className="text-white hover:text-amber-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" title={canControl ? 'Play or pause' : 'Control is with your partner'}>
                {isPlaying ? <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>

              {/* Time */}
              <span className="text-xs sm:text-sm text-gray-300 tabular-nums">
                {currentTime} / {duration || '--:--'}
              </span>

              {/* Volume (100% locally independent per Q018) */}
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
                  title="Local volume (independent)"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Quality selector */}
              {formats && formats.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300 hover:bg-white/20 cursor-pointer"
                  >
                    {selectedQuality === 'default' ? '360p' : selectedQuality}
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                      <button
                        onClick={() => {
                          setSelectedQuality('default')
                          setShowQualityMenu(false)
                        }}
                        className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-800 cursor-pointer"
                      >
                        Default (360p)
                      </button>
                      {formats.map((f) => (
                        <button
                          key={f.format_id}
                          onClick={() => {
                            setSelectedQuality(`${f.height}p`)
                            setShowQualityMenu(false)
                            // Quality change would require re-extracting URL
                          }}
                          className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-800 cursor-pointer"
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
