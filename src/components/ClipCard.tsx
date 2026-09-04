'use client'

import { useState, useRef, useEffect } from 'react'
import { PlayIcon, EyeIcon, BadgeCheckIcon, HeartIcon } from '@/components/icons'

interface ClipCardProps {
  clipId: string
  title: string
  username: string
  thumbnail: string | null
  preview?: string | null
  duration: number | null
  views: number | null
  likes: number | null
  verified: boolean
  onClick: () => void
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

export default function ClipCard({
  clipId,
  title,
  username,
  thumbnail,
  preview,
  duration,
  views,
  likes,
  verified,
  onClick,
}: ClipCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [inView, setInView] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = cardRef.current
    if (!node) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setInView(entry.isIntersecting))
    }, {
      rootMargin: '250px 0px',
      threshold: 0.01,
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const shouldRenderImage = inView || isHovering

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="group cursor-pointer break-inside-avoid mb-3"
    >
      {/* Thumbnail */}
      <div className="relative rounded-xl overflow-hidden bg-[#1a120c]" style={{ aspectRatio: '9/14' }}>
        {shouldRenderImage && thumbnail && !imgError ? (
          <>
            <img
              src={thumbnail}
              alt=""
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isHovering ? 'scale-110' : 'scale-100'
              } ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1a120c]">
                <div className="w-8 h-8 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a120c]">
            <PlayIcon className="w-10 h-10 text-amber-900/40" />
          </div>
        )}

        {preview && isHovering && inView && !previewError && (
          <video
            src={`/api/proxy?url=${encodeURIComponent(preview)}`}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
            onError={() => setPreviewError(true)}
          />
        )}

        {/* Hover play overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isHovering ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center">
            <PlayIcon className="w-7 h-7 text-white ml-0.5" />
          </div>
        </div>

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Duration badge */}
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-sm px-1.5 py-0.5 rounded text-[11px] font-semibold text-white tabular-nums">
            {formatDuration(duration)}
          </div>
        )}

        {/* Views badge */}
        {views && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/85 backdrop-blur-sm px-1.5 py-0.5 rounded text-[11px] text-white/80">
            <EyeIcon className="w-3 h-3" />
            <span className="tabular-nums">{formatCount(views)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-center gap-2 px-1 mt-2">
        {/* User avatar */}
        <div className="w-6 h-6 rounded-full bg-[#2a1f16] border border-amber-900/30 flex items-center justify-center shrink-0">
          <span className="text-[8px] font-bold text-amber-400/80 uppercase">
            {username ? username.slice(0, 2) : '??'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[#c7b5a3] font-medium truncate">
              {username || 'Unknown'}
            </span>
            {verified && <BadgeCheckIcon className="w-3 h-3 text-amber-400/60 shrink-0" />}
          </div>
        </div>

        {likes && (
          <div className="flex items-center gap-0.5 text-[10px] text-[#8c7867] shrink-0">
            <HeartIcon className="w-3 h-3" />
            <span className="tabular-nums">{formatCount(likes)}</span>
          </div>
        )}
      </div>

      {/* Title */}
      {title && (
        <h3 className="text-[12px] font-medium text-[#e5d8ca] leading-snug mt-1 px-1 line-clamp-2 group-hover:text-white transition-colors">
          {title}
        </h3>
      )}
    </div>
  )
}
