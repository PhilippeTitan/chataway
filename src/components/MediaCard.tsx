'use client'

import React, { useState, useRef, useEffect } from 'react'
import { PlayIcon, HeartIcon } from '@/components/icons'
import { haptics } from '@/utils/haptics'

export interface MediaItem {
  id: string
  title: string
  thumbnail: string | null
  preview?: string | null
  duration?: string | number | null
  views?: string | number | null
  likes?: number | null
  site?: string
  siteUrl?: string
  hash?: string
  username?: string
  tags?: string[]
}

export interface MediaCardProps {
  item: MediaItem
  variant?: 'video' | 'clip'
  isExtracting?: boolean
  isSaved?: boolean
  onSelect: (item: MediaItem) => void
  onToggleSave?: (item: MediaItem) => void
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  variant = 'video',
  isExtracting = false,
  isSaved = false,
  onSelect,
  onToggleSave,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)

  const isPortrait = variant === 'clip'

  const handleMouseEnter = () => {
    if (!item.preview) return
    hoverTimeout.current = setTimeout(() => {
      setIsHovered(true)
    }, 400) // 400ms debounce
  }

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    setIsHovered(false)
    setPreviewLoaded(false)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    }
  }, [])

  const handleClick = () => {
    haptics.confirm()
    onSelect(item)
  }

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    haptics.lightTap()
    onToggleSave?.(item)
  }

  const formattedDuration =
    typeof item.duration === 'number'
      ? `${Math.floor(item.duration / 60)}:${Math.floor(item.duration % 60)
          .toString()
          .padStart(2, '0')}`
      : item.duration || null

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer select-none bg-[#160e0a] border transition-all duration-300 btn-press ${
        isExtracting
          ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-2xl shadow-amber-950/60'
          : 'border-amber-900/30 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-950/50'
      }`}
    >
      {/* Media Aspect Ratio Container */}
      <div
        className={`relative w-full overflow-hidden bg-[#120a06] ${
          isPortrait ? 'aspect-[9/16]' : 'aspect-video'
        }`}
      >
        {/* Poster Thumbnail */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title || 'Video preview'}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
              isHovered && previewLoaded ? 'opacity-0' : 'opacity-100'
            }`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-amber-950/30 via-orange-950/20 to-transparent flex items-center justify-center">
            <PlayIcon className="w-8 h-8 text-amber-500/40" />
          </div>
        )}

        {/* 3s Looping Hover Preview [Q40] */}
        {isHovered && item.preview && (
          <video
            ref={previewVideoRef}
            src={item.preview}
            muted
            loop
            autoPlay
            playsInline
            onLoadedData={() => setPreviewLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              previewLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* In-Card Extraction Progress Ring [Q36] */}
        {isExtracting && (
          <div className="absolute inset-0 bg-[#0e0a07]/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-3 animate-fade-in">
            <div className="relative w-10 h-10 mb-2">
              <div className="absolute inset-0 rounded-full border-2 border-amber-900/40" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-500 animate-spin" />
            </div>
            <p className="text-[11px] font-serif italic text-amber-200">Connecting stream...</p>
          </div>
        )}

        {/* Top Badges (Site / Save) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center z-10 pointer-events-none">
          {item.site ? (
            <span className="px-2 py-0.5 rounded-md bg-[#0e0a07]/80 backdrop-blur-md text-[10px] font-mono tracking-wider uppercase text-amber-300/90 border border-amber-900/40">
              {item.site}
            </span>
          ) : <span />}

          {onToggleSave && (
            <button
              onClick={handleSaveClick}
              className={`p-1.5 rounded-full pointer-events-auto backdrop-blur-md transition-all ${
                isSaved
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                  : 'bg-[#0e0a07]/60 text-[#a89582] hover:text-amber-300 hover:bg-[#0e0a07]/90'
              }`}
              title={isSaved ? 'In Vault' : 'Save to Vault'}
            >
              <HeartIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom Metadata Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-[#0e0a07] via-[#0e0a07]/70 to-transparent flex items-end justify-between z-10 pointer-events-none">
          {formattedDuration && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#0e0a07]/85 text-[10px] font-mono tabular-nums text-amber-200 border border-amber-900/40">
              {formattedDuration}
            </span>
          )}

          {item.views && (
            <span className="text-[10px] font-mono text-[#a89582] drop-shadow-sm">
              {typeof item.views === 'number' ? `${(item.views / 1000).toFixed(1)}k` : item.views}
            </span>
          )}
        </div>
      </div>

      {/* Card Title & Info */}
      <div className="p-3">
        <h4 className="text-xs sm:text-sm font-medium text-[#f5ebe0] line-clamp-2 group-hover:text-amber-200 transition-colors">
          {item.title}
        </h4>
        {item.username && (
          <p className="text-[11px] text-[#a89582] mt-1 truncate">@{item.username}</p>
        )}
      </div>
    </div>
  )
}
