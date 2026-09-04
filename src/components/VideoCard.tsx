'use client'

import { useState } from 'react'
import { PlayIcon, EyeIcon, BadgeCheckIcon, MoreVerticalIcon } from '@/components/icons'

interface VideoCardProps {
  videoId: string
  title: string
  thumbnail: string | null
  preview?: string | null
  duration?: string | null
  views?: string | null
  site?: string
  siteUrl?: string
  onClick: () => void
}

export default function VideoCard({
  videoId,
  title,
  thumbnail,
  preview,
  duration,
  views,
  site,
  onClick,
}: VideoCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [imageSrc, setImageSrc] = useState(thumbnail)
  const [isHovering, setIsHovering] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  const fallbackImageSrc = thumbnail?.replace(
    /\/xv_[^/]+_t\.(jpg|jpeg|png|webp)$/i,
    '/mozaique_listing.jpg'
  )

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="group cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-[#1a120c] relative rounded-lg overflow-hidden mb-2">
        {imageSrc && !imgError ? (
          <>
            <img
              src={`/api/proxy?url=${encodeURIComponent(imageSrc)}`}
              alt=""
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isHovering ? 'scale-110' : 'scale-100'
              } ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                if (fallbackImageSrc && imageSrc !== fallbackImageSrc) {
                  setImageSrc(fallbackImageSrc)
                  setImgLoaded(false)
                } else {
                  setImgError(true)
                }
              }}
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

        {/* Hover preview */}
        {preview && isHovering && !previewError && (
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

        {/* Bottom gradient */}
        <div className={`absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${
          isHovering ? 'opacity-100' : 'opacity-0'
        }`} />

        {/* Play button on hover */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isHovering ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}>
          <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center">
            <PlayIcon className="w-6 h-6 text-white ml-0.5" />
          </div>
        </div>

        {/* Duration badge — bottom right like PH */}
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-sm px-1.5 py-0.5 rounded text-[11px] font-semibold text-white tabular-nums">
            {duration}
          </div>
        )}
      </div>

      {/* Info row: channel + views */}
      <div className="flex items-center gap-2 px-0.5">
        {/* Site/channel avatar */}
        <div className="w-7 h-7 rounded-full bg-[#2a1f16] border border-amber-900/30 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-amber-400/80 uppercase">
            {site ? site.slice(0, 2) : '??'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Channel name + verified */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#c7b5a3] font-medium truncate">
              {site || 'Unknown'}
            </span>
            <BadgeCheckIcon className="w-3 h-3 text-amber-400/60 shrink-0" />
          </div>
        </div>

        {/* Views */}
        {views && (
          <div className="flex items-center gap-1 text-[11px] text-[#8c7867] shrink-0">
            <EyeIcon className="w-3 h-3" />
            <span>{views}</span>
          </div>
        )}

        {/* 3-dot menu */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-white/5 transition cursor-pointer opacity-0 group-hover:opacity-100"
        >
          <MoreVerticalIcon className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-[13px] font-medium text-[#e5d8ca] leading-snug mt-1 px-0.5 line-clamp-2 group-hover:text-white transition-colors">
        {title}
      </h3>
    </div>
  )
}
