'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PlayIcon, HomeIcon, SearchIcon, Spinner } from '@/components/icons'
import SearchAutocomplete, { SearchFilters } from '@/components/SearchAutocomplete'
import VideoCard from '@/components/VideoCard'
import VideoPlayer from '@/components/VideoPlayer'
import { filterSeen, markSeen } from '@/utils/dedup'

interface Video {
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

interface VideoWithStream extends Video {
  streamUrl?: string
  formats?: { format_id: string; url: string; ext: string; width: number; height: number }[]
}

const videoCache = new Map<string, Video[]>()

export default function Solo() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoWithStream | null>(null)
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const lastSearch = useRef<{ query: string; filters: SearchFilters; page: number } | null>(null)

  const searchVideos = useCallback(async (query: string, filters: SearchFilters, page = 1, append = false) => {
    if (!query.trim()) return

    if (append) setLoadingMore(true)
    else lastSearch.current = { query, filters, page: 1 }

    // Create cache key including filters
    const cacheKey = `${query}_${filters.sortBy}_${filters.site}`

    // Check cache first
    if (!append && videoCache.has(cacheKey)) {
      const cached = videoCache.get(cacheKey)!
      const unseen = await filterSeen(cached)
      setVideos(unseen)
      setSearched(true)
      lastSearch.current = { query, filters, page: 1 }
      setHasMore(true)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        sort: filters.sortBy,
        site: filters.site,
      })
      const res = await fetch(`/api/search?${params.toString()}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        const results: Video[] = data.slice(0, 40).map((v: Record<string, unknown>) => ({
          videoId: String(v.videoId || ''),
          thumbnail: v.thumbnail as string | null,
          preview: v.preview as string | null,
          title: String(v.title || 'Untitled'),
          duration: v.duration as string | null,
          views: v.views as string | null,
          site: v.site as string,
          siteUrl: v.siteUrl as string,
          hash: v.hash as string,
        }))

        if (!append) videoCache.set(cacheKey, results)

        // Filter out seen videos
        const unseen = await filterSeen(results)
        setVideos(prev => append
          ? [...prev, ...unseen.filter(video => !prev.some(existing => existing.hash === video.hash))]
          : unseen
        )
        lastSearch.current = { query, filters, page }
        setHasMore(data.length > 0)
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const handleSearch = useCallback((query: string, filters: SearchFilters) => {
    setSearchQuery(query)
    searchVideos(query, filters)
  }, [searchVideos])

  const loadMore = useCallback(() => {
    const currentSearch = lastSearch.current
    if (currentSearch && !loadingMore) {
      searchVideos(currentSearch.query, currentSearch.filters, currentSearch.page + 1, true)
    }
  }, [loadingMore, searchVideos])

  const handleVideoClick = useCallback(async (video: Video) => {
    // Check if already seen
    if (video.hash) {
      const isSeen = await filterSeen([video])
      if (isSeen.length === 0) {
        // Already seen, skip to next
        const currentIndex = videos.findIndex(v => v.hash === video.hash)
        const nextVideo = videos[currentIndex + 1]
        if (nextVideo) {
          handleVideoClick(nextVideo)
        }
        return
      }
    }

    // Extract stream URL
    setExtracting(true)
    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(video.siteUrl || '')}&hash=${video.hash || ''}`)
      const data = await res.json()

      if (data.streamUrl) {
        // Mark as seen
        if (video.hash && video.site && video.videoId) {
          await markSeen(video)
        }

        setSelectedVideo({
          ...video,
          streamUrl: data.streamUrl,
          thumbnail: data.thumbnail || video.thumbnail,
          formats: data.formats,
        })
      } else {
        // Extraction failed - skip to next video
        console.warn('Extraction failed, skipping to next video')
        const currentIndex = videos.findIndex(v => v.hash === video.hash)
        const nextVideo = videos[currentIndex + 1]
        if (nextVideo) {
          handleVideoClick(nextVideo)
        }
      }
    } catch (err) {
      console.error('Extraction failed:', err)
      // Skip to next on error
      const currentIndex = videos.findIndex(v => v.hash === video.hash)
      const nextVideo = videos[currentIndex + 1]
      if (nextVideo) {
        handleVideoClick(nextVideo)
      }
    }
    setExtracting(false)
  }, [videos])

  const handleBack = useCallback(() => {
    setSelectedVideo(null)
  }, [])

  // If video is selected, show player
  if (selectedVideo && selectedVideo.streamUrl) {
    return (
      <VideoPlayer
        streamUrl={selectedVideo.streamUrl}
        thumbnail={selectedVideo.thumbnail || ''}
        title={selectedVideo.title}
        duration={selectedVideo.duration || undefined}
        onBack={handleBack}
        formats={selectedVideo.formats}
      />
    )
  }

  return (
    <div className="min-h-dvh bg-[#0e0a07] text-[#f5ebe0]">
      {/* Header */}
      <div className="p-4 border-b border-amber-900/30 bg-[#130c07]/80 backdrop-blur-md flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PlayIcon className="w-6 h-6 text-amber-400" /> Solo Mode
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/queue')}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg text-sm font-semibold hover:from-amber-500 hover:to-orange-500 transition cursor-pointer flex items-center gap-2"
          >
            <SearchIcon className="w-4 h-4" /> Find Match
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#261b14] border border-amber-900/35 rounded-lg text-sm hover:bg-[#32231a] transition cursor-pointer flex items-center gap-2"
          >
            <HomeIcon className="w-4 h-4" /> Home
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Autocomplete Search */}
          <div className="mb-8">
            <SearchAutocomplete
              onSearch={handleSearch}
              placeholder="Search videos..."
              autoFocus
            />
          </div>

          {/* Extracting overlay */}
          {extracting && (
            <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center animate-scale-in">
                <Spinner className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <p className="text-sm text-gray-300">Loading video...</p>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && videos.length === 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-900 rounded-lg overflow-hidden animate-slide-up">
                  <div className="aspect-video bg-gray-800 animate-shimmer" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-3/4 animate-shimmer" />
                    <div className="h-3 bg-gray-800 rounded w-1/2 animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!searched && !loading && (
            <div className="text-center py-20 text-gray-500">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-lg">Start typing to search</p>
              <p className="text-sm mt-2">Videos from XVideos</p>
            </div>
          )}

          {/* No Results */}
          {searched && !loading && videos.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg">No new videos found</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          )}

          {/* Video Grid */}
          {videos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
              {videos.map((video) => (
                <div key={`${video.hash || video.videoId}_${video.thumbnail || ''}`} className="animate-slide-up">
                  <VideoCard
                    videoId={video.videoId}
                    title={video.title}
                    thumbnail={video.thumbnail}
                    preview={video.preview}
                    duration={video.duration}
                    views={video.views}
                    site={video.site}
                    onClick={() => handleVideoClick(video)}
                  />
                </div>
              ))}
            </div>
          )}

          {searched && videos.length > 0 && hasMore && (
            <div className="flex justify-center py-10">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 bg-gray-800 rounded-lg text-sm font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50 transition-all cursor-pointer btn-press"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
