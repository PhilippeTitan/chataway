'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PlayIcon } from '@/components/icons'

interface VideoCardProps {
  videoId: string
  title: string
  thumbnail: string | null
  preview?: string | null
  duration?: string | null
  views?: string | null
  site?: string
  onClick: () => void
  onHoverStart?: () => void
  onHoverEnd?: () => void
  isHovered?: boolean
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
  onHoverStart,
  onHoverEnd,
  isHovered = false,
}: VideoCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [imageSrc, setImageSrc] = useState(thumbnail)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  const fallbackImageSrc = thumbnail?.replace(
    /\/xv_[^/]+_t\.(jpg|jpeg|png|webp)$/i,
    '/mozaique_listing.jpg'
  )

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => {
        setIsPreviewing(true)
        onHoverStart?.()
      }}
      onMouseLeave={() => {
        setIsPreviewing(false)
        onHoverEnd?.()
      }}
      className="bg-[#1c130d] border border-amber-900/20 rounded-lg overflow-hidden hover:ring-2 hover:ring-amber-600/70 transition-all duration-200 cursor-pointer group"
    >
      <div className="aspect-video bg-[#261811] relative overflow-hidden">
        {imageSrc && !imgError ? (
          <>
            <img
              src={`/api/proxy?url=${encodeURIComponent(imageSrc)}`}
              alt=""
              className={`w-full h-full object-cover transition-all duration-300 ${
                isHovered ? 'scale-110' : 'scale-100'
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
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#261811]">
            <PlayIcon className="w-12 h-12 text-amber-900" />
          </div>
        )}

        {preview && isPreviewing && !previewError && (
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

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`} />

        {/* Play button */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}>
          <div className="w-14 h-14 bg-purple-600/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
            <PlayIcon className="w-7 h-7 text-white ml-1" />
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-medium">
            {duration}
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="p-3">
        <h3 className={`font-medium text-sm line-clamp-2 transition-colors ${
          isHovered ? 'text-amber-300' : 'text-white'
        }`}>
          {title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          {views && <span>{views}</span>}
        </div>
      </div>
    </div>
  )
}
