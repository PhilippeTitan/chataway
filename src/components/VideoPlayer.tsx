'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Hls from 'hls.js'
import { PlayIcon, PauseIcon, VolumeIcon, BackIcon, FullscreenIcon } from '@/components/icons'

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
  const [isFullscreen, setIsFullscreen] = useState(false)
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === videoRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

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

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void video.requestFullscreen()
    }
  }, [])

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
      className={`${mode === 'together' ? 'relative w-full h-full min-h-0' : 'fixed inset-0 z-50'} bg-black flex flex-col`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className={`absolute top-4 left-4 z-50 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition cursor-pointer flex items-center gap-2 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <BackIcon className="w-5 h-5" /> Back
      </button>

      {/* Video */}
      <div className={`flex-1 flex items-center justify-center ${canControl ? 'cursor-pointer' : 'cursor-default'}`} onClick={togglePlay}>
        <video
          ref={videoRef}
          src={proxyUrl}
          poster={thumbnail}
          className="w-full h-full max-w-full max-h-full object-contain cursor-pointer"
          playsInline
          controls={isFullscreen}
        />
      </div>

      {/* Controls */}
      <div className={`p-4 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-4xl mx-auto">
          {/* Progress bar */}
          <div
            className={`w-full h-1.5 bg-gray-700 rounded-full mb-3 group ${canControl ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-purple-500 rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
                <button onClick={togglePlay} disabled={!canControl} className="text-white hover:text-purple-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" title={canControl ? 'Play or pause' : 'Control is with your partner'}>
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
              </button>

              {/* Time */}
              <span className="text-sm text-gray-300">
                {currentTime} / {duration || '--:--'}
              </span>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <VolumeIcon className="w-5 h-5 text-gray-400" />
                <input
                  disabled={!canControl}
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
                  className="w-20 cursor-pointer accent-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Quality selector */}
              {formats && formats.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 hover:bg-gray-700 cursor-pointer"
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

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-white hover:text-purple-400 transition cursor-pointer">
                <FullscreenIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-white font-semibold mt-2 truncate">{title}</h3>
        </div>
      </div>
    </div>
  )
}
