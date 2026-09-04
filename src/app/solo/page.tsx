'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PlayIcon, HomeIcon, SearchIcon } from '@/components/icons'
import SearchAutocomplete, { SearchFilters } from '@/components/SearchAutocomplete'
import VideoCard from '@/components/VideoCard'
import VideoPlayer from '@/components/VideoPlayer'
import { filterSeen, markSeen } from '@/utils/dedup'

interface Video {
  videoId: string
  thumbnail: string | null
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

  const searchVideos = useCallback(async (query: string, filters: SearchFilters) => {
    if (!query.trim()) return

    // Create cache key including filters
    const cacheKey = `${query}_${filters.sortBy}_${filters.site}`

    // Check cache first
    if (videoCache.has(cacheKey)) {
      const cached = videoCache.get(cacheKey)!
      const unseen = await filterSeen(cached)
      setVideos(unseen)
      setSearched(true)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({
        q: query,
        sort: filters.sortBy,
        site: filters.site,
      })
      const res = await fetch(`/api/search?${params.toString()}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        const results: Video[] = data.slice(0, 20).map((v: Record<string, unknown>) => ({
          videoId: String(v.videoId || ''),
          thumbnail: v.thumbnail as string | null,
          title: String(v.title || 'Untitled'),
          duration: v.duration as string | null,
          views: v.views as string | null,
          site: v.site as string,
          siteUrl: v.siteUrl as string,
          hash: v.hash as string,
        }))

        videoCache.set(cacheKey, results)

        // Filter out seen videos
        const unseen = await filterSeen(results)
        setVideos(unseen)
      }
    } catch (err) {
      console.error('Search failed:', err)
    }
    setLoading(false)
  }, [])

  const handleSearch = useCallback((query: string, filters: SearchFilters) => {
    setSearchQuery(query)
    searchVideos(query, filters)
  }, [searchVideos])

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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PlayIcon className="w-6 h-6 text-purple-500" /> Solo Mode
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/queue')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-pink-600 rounded-lg text-sm font-semibold hover:opacity-90 transition cursor-pointer flex items-center gap-2"
          >
            <SearchIcon className="w-4 h-4" /> Find Match
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 transition cursor-pointer flex items-center gap-2"
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
            <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-300">Loading video...</p>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && videos.length === 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-900 rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-video bg-gray-800" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-3/4" />
                    <div className="h-3 bg-gray-800 rounded w-1/2" />
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard
                  key={video.hash || video.videoId}
                  videoId={video.videoId}
                  title={video.title}
                  thumbnail={video.thumbnail}
                  duration={video.duration}
                  views={video.views}
                  site={video.site}
                  onClick={() => handleVideoClick(video)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
