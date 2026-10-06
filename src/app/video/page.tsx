'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import VideoPlayer from '@/components/VideoPlayer'
import { MediaCard, MediaItem } from '@/components/MediaCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackIcon, PlayIcon, HeartIcon } from '@/components/icons'
import { haptics } from '@/utils/haptics'
import { useToast } from '@/components/ui/Toast'
import { markSeen } from '@/utils/dedup'
import { saveToVault, removeFromVault, isInVault } from '@/utils/vault'

interface VideoData {
  streamUrl: string
  thumbnail: string
  title: string
  duration?: string
  siteUrl?: string
  hash?: string
  site?: string
  videoId?: string
  formats?: { format_id: string; url: string; ext: string; width: number; height: number }[]
}

interface RecommendedVideo {
  videoId: string
  thumbnail: string | null
  preview?: string | null
  title: string
  duration?: string | null
  views?: string | null
  site?: string
  siteUrl?: string
  hash?: string
}

function VideoPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [extracting, setExtracting] = useState(true)
  const [recommended, setRecommended] = useState<RecommendedVideo[]>([])
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [isSaved, setIsSaved] = useState(false)

  // Extract URL params
  const url = searchParams.get('url') || ''
  const hash = searchParams.get('hash') || ''
  const title = searchParams.get('title') || 'Video'
  const thumbnail = searchParams.get('thumb') || ''
  const duration = searchParams.get('dur') || undefined
  const site = searchParams.get('site') || ''
  const videoId = searchParams.get('vid') || ''

  // Check vault status
  useEffect(() => {
    const checkVault = async () => {
      const vaultId = hash || videoId
      if (vaultId) {
        const saved = await isInVault(vaultId)
        setIsSaved(saved)
      }
    }
    checkVault()
  }, [hash, videoId])

  // Extract stream URL
  useEffect(() => {
    if (!url) return

    const extract = async () => {
      setExtracting(true)
      try {
        const res = await fetch(
          `/api/extract?url=${encodeURIComponent(url)}&hash=${hash}`
        )
        const data = await res.json()

        if (data.streamUrl) {
          setVideoData({
            streamUrl: data.streamUrl,
            thumbnail: data.thumbnail || thumbnail,
            title,
            duration,
            siteUrl: url,
            hash,
            site,
            videoId,
            formats: data.formats,
          })

          // Mark as seen
          if (hash) {
            await markSeen({ hash })
          }
        } else {
          toast({
            title: 'Stream unavailable',
            description: 'Could not extract video stream',
            variant: 'alert',
          })
        }
      } catch {
        toast({
          title: 'Extraction failed',
          description: 'Network error during stream extraction',
          variant: 'alert',
        })
      } finally {
        setExtracting(false)
      }
    }

    extract()
  }, [url, hash, thumbnail, title, duration, site, videoId, toast])

  // Fetch recommendations
  useEffect(() => {
    if (!url) return

    const fetchRecs = async () => {
      setLoadingRecs(true)
      try {
        const params = new URLSearchParams({ url, title, count: '24' })
        const res = await fetch(`/api/recommend?${params.toString()}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          // Filter out current video
          setRecommended(data.filter((v: RecommendedVideo) => v.hash !== hash))
        }
      } catch (err) {
        console.error('Recommendations fetch failed:', err)
      } finally {
        setLoadingRecs(false)
      }
    }

    fetchRecs()
  }, [url, title, hash])

  const handleBack = useCallback(() => {
    haptics.lightTap()
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/solo')
    }
  }, [router])

  const handleRecommendedSelect = useCallback(
    (item: MediaItem) => {
      haptics.confirm()
      // Navigate to the same video page with new params
      const params = new URLSearchParams({
        url: item.siteUrl || '',
        hash: item.hash || '',
        title: item.title || '',
        thumb: item.thumbnail || '',
        dur: typeof item.duration === 'string' ? item.duration : '',
        site: item.site || '',
        vid: item.id || '',
      })
      router.push(`/video?${params.toString()}`)
    },
    [router]
  )

  const handleToggleVault = async () => {
    const vaultId = hash || videoId
    if (!vaultId) return

    if (isSaved) {
      await removeFromVault(vaultId)
      setIsSaved(false)
      toast({ title: 'Removed from Vault', variant: 'info' })
    } else {
      const success = await saveToVault({
        id: vaultId,
        title,
        thumbnail: thumbnail || '',
        streamUrl: videoData?.streamUrl || '',
        site: site || 'video',
        duration,
      })
      if (success) {
        setIsSaved(true)
        toast({
          title: 'Saved to Encrypted Vault',
          description: 'Available offline',
          variant: 'success',
        })
      } else {
        toast({
          title: 'Vault Full (Cap 5)',
          description: 'Remove an older clip first',
          variant: 'alert',
        })
      }
    }
  }

  return (
    <div className="min-h-dvh bg-[#0e0a07] text-[#f5ebe0] selection:bg-amber-700/30 selection:text-amber-200">
      {/* Main Layout: Player + Sidebar */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 pt-3 pb-12">
        {/* Back Button + Title Bar */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={handleBack}
            className="p-2.5 rounded-xl bg-[#160e0a]/85 border border-amber-900/30 text-[#f5ebe0] hover:bg-[#261b14] transition cursor-pointer flex items-center gap-2 backdrop-blur-md btn-press"
          >
            <BackIcon className="w-4 h-4 text-amber-400" />
            <span className="text-xs sm:text-sm">Back</span>
          </button>

          <h1 className="flex-1 text-sm sm:text-base font-serif italic text-[#fef9f5] truncate">
            {title}
          </h1>

          {/* Vault Save Button */}
          <button
            onClick={handleToggleVault}
            className={`p-2.5 rounded-xl border transition cursor-pointer btn-press flex items-center gap-1.5 ${
              isSaved
                ? 'bg-amber-500 border-amber-400 text-black'
                : 'bg-[#160e0a]/85 border-amber-900/30 text-[#a89582] hover:text-amber-300 hover:bg-[#261b14]'
            }`}
            title={isSaved ? 'In Vault' : 'Save to Vault'}
          >
            <HeartIcon className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {/* Desktop: Player (left 70%) + Sidebar (right 30%) */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Player Column */}
          <div className="flex-1 min-w-0">
            <VideoPlayer
              streamUrl={videoData?.streamUrl || ''}
              thumbnail={thumbnail}
              title={title}
              duration={duration}
              onBack={handleBack}
              formats={videoData?.formats}
              mode="embedded"
              extracting={extracting}
            />

            {/* Video Info (below player on all screens) */}
            <div className="mt-4 p-4 bg-[#160e0a]/60 border border-amber-900/20 rounded-2xl">
              <h2 className="text-base sm:text-lg font-serif italic text-[#fef9f5] mb-2 line-clamp-2">
                {title}
              </h2>
              <div className="flex items-center gap-3 text-[11px] text-[#a89582] font-mono">
                {duration && <span>{duration}</span>}
                {site && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-950/50 border border-amber-900/30 uppercase tracking-wider">
                    {site}
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Recommendations (below player) */}
            <div className="lg:hidden mt-6">
              <h3 className="text-sm font-serif italic text-amber-200 mb-3 px-1">
                Related Videos
              </h3>
              <RecommendationGrid
                videos={recommended}
                loading={loadingRecs}
                onSelect={handleRecommendedSelect}
              />
            </div>
          </div>

          {/* Desktop Sidebar Recommendations */}
          <aside className="hidden lg:block w-[340px] xl:w-[380px] shrink-0">
            <h3 className="text-sm font-serif italic text-amber-200 mb-3 px-1 sticky top-3">
              Up Next
            </h3>
            <div className="space-y-3 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-900/40 scrollbar-track-transparent pr-1">
              {loadingRecs
                ? [...Array(8)].map((_, i) => (
                    <SidebarSkeleton key={i} />
                  ))
                : recommended.map((video) => (
                    <SidebarCard
                      key={video.hash || video.videoId}
                      video={video}
                      onSelect={handleRecommendedSelect}
                    />
                  ))}
              {!loadingRecs && recommended.length === 0 && (
                <p className="text-xs text-[#a89582] text-center py-8">
                  No recommendations found
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

/** Sidebar recommendation card — horizontal layout for desktop sidebar */
function SidebarCard({
  video,
  onSelect,
}: {
  video: RecommendedVideo
  onSelect: (item: MediaItem) => void
}) {
  return (
    <div
      onClick={() =>
        onSelect({
          id: video.videoId,
          title: video.title,
          thumbnail: video.thumbnail,
          preview: video.preview,
          duration: video.duration,
          views: video.views,
          site: video.site,
          siteUrl: video.siteUrl,
          hash: video.hash,
        })
      }
      className="group flex gap-3 cursor-pointer rounded-xl p-2 hover:bg-[#1c130d] transition btn-press"
    >
      {/* Thumbnail */}
      <div className="relative w-40 shrink-0 aspect-video rounded-lg overflow-hidden bg-[#120a06]">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlayIcon className="w-5 h-5 text-amber-500/40" />
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-[#0e0a07]/85 text-[9px] font-mono tabular-nums text-amber-200 border border-amber-900/40">
            {video.duration}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <h4 className="text-xs font-medium text-[#f5ebe0] line-clamp-2 group-hover:text-amber-200 transition-colors leading-relaxed">
          {video.title}
        </h4>
        {video.site && (
          <span className="inline-block mt-1.5 text-[10px] font-mono uppercase tracking-wider text-[#a89582]">
            {video.site}
          </span>
        )}
      </div>
    </div>
  )
}

/** Skeleton for sidebar loading state */
function SidebarSkeleton() {
  return (
    <div className="flex gap-3 p-2">
      <Skeleton variant="card" aspectRatio="video" className="w-40 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton variant="text" className="w-full h-3 rounded" />
        <Skeleton variant="text" className="w-3/4 h-3 rounded" />
        <Skeleton variant="text" className="w-1/3 h-2.5 rounded" />
      </div>
    </div>
  )
}

/** Mobile recommendation grid */
function RecommendationGrid({
  videos,
  loading,
  onSelect,
}: {
  videos: RecommendedVideo[]
  loading: boolean
  onSelect: (item: MediaItem) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <Skeleton variant="card" aspectRatio="video" className="rounded-xl" />
            <div className="p-2 space-y-1">
              <Skeleton variant="text" className="w-3/4 h-3 rounded" />
              <Skeleton variant="text" className="w-1/2 h-2.5 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {videos.map((video) => (
        <MediaCard
          key={video.hash || video.videoId}
          item={{
            id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            preview: video.preview,
            duration: video.duration,
            views: video.views,
            site: video.site,
            siteUrl: video.siteUrl,
            hash: video.hash,
          }}
          variant="video"
          onSelect={onSelect}
        />
      ))}
      {videos.length === 0 && (
        <p className="col-span-2 text-xs text-[#a89582] text-center py-8">
          No recommendations found
        </p>
      )}
    </div>
  )
}

export default function VideoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#0e0a07] flex items-center justify-center">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-amber-900/40" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-500 animate-spin" />
          </div>
        </div>
      }
    >
      <VideoPageContent />
    </Suspense>
  )
}
