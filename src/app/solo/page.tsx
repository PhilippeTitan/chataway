'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlayIcon, HomeIcon, SearchIcon, Spinner, GridIcon, FilmIcon } from '@/components/icons'
import SearchAutocomplete, { SearchFilters } from '@/components/SearchAutocomplete'
import VideoCard from '@/components/VideoCard'
import VideoPlayer from '@/components/VideoPlayer'
import ClipCard from '@/components/ClipCard'
import ClipsPlayer from '@/components/ClipsPlayer'
import MasonryGrid from '@/components/MasonryGrid'
import NichesBar from '@/components/NichesBar'
import { filterSeen, markSeen } from '@/utils/dedup'
import type { Clip } from '@/types/clips'

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
const clipCache = new Map<string, Clip[]>()
const INITIAL_CLIP_COUNT = 10
const INITIAL_VIDEO_COUNT = 12

export default function Solo() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoWithStream | null>(null)
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [contentMode, setContentMode] = useState<'videos' | 'clips'>('videos')
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null)
  const lastSearch = useRef<{ query: string; filters: SearchFilters; page: number; action: 'search' | 'trending' | 'niche' } | null>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)

  const searchClips = useCallback(async (query: string, action: string = 'search', append = false, page = 1) => {
    if (!query.trim() && action === 'search') return

    if (append) setLoadingMore(true)
    else lastSearch.current = { query, filters: { sortBy: 'relevance', site: 'all' }, page: 1, action: action === 'niche' ? 'niche' : action === 'trending' ? 'trending' : 'search' }

    const cacheKey = `${action}_${query}_${page}`

    if (!append && clipCache.has(`${action}_${query}`)) {
      const cached = clipCache.get(`${action}_${query}`)!
      setClips(cached)
      setSearched(true)
      setHasMore(cached.length >= INITIAL_CLIP_COUNT)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({
        q: query,
        action,
        count: String(INITIAL_CLIP_COUNT),
        page: String(page),
      })
      const res = await fetch(`/api/search-redgifs?${params.toString()}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        const results: Clip[] = data.filter((c: Record<string, unknown>) => !c.error).map((c: Record<string, unknown>) => ({
          clipId: String(c.clipId || ''),
          title: String(c.title || ''),
          username: String(c.username || ''),
          thumbnail: c.thumbnail as string | null,
          hdUrl: c.hdUrl as string | null,
          sdUrl: c.sdUrl as string | null,
          preview: c.preview as string | null,
          duration: c.duration as number | null,
          views: c.views as number | null,
          likes: c.likes as number | null,
          tags: (c.tags as string[]) || [],
          verified: Boolean(c.verified),
          site: 'redgifs',
          hash: String(c.hash || ''),
        }))

        if (!append) clipCache.set(`${action}_${query}`, results)
        setClips(prev => append
          ? [...prev, ...results.filter(c => !prev.some(e => e.clipId === c.clipId))]
          : results
        )
        if (!append) {
          lastSearch.current = { query, filters: { sortBy: 'relevance', site: 'all' }, page, action: action === 'niche' ? 'niche' : action === 'trending' ? 'trending' : 'search' }
        } else if (lastSearch.current) {
          lastSearch.current.page = page
        }
        setHasMore(data.length >= INITIAL_CLIP_COUNT)
      }
    } catch (err) {
      console.error('Clip search failed:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const searchVideos = useCallback(async (query: string, filters: SearchFilters, page = 1, append = false) => {
    if (!query.trim()) return

    if (append) setLoadingMore(true)
    else lastSearch.current = { query, filters, page: 1, action: 'search' }

    const cacheKey = `${query}_${filters.sortBy}_${filters.site}`

    if (!append && videoCache.has(cacheKey)) {
      const cached = videoCache.get(cacheKey)!
      const unseen = await filterSeen(cached)
      setVideos(unseen)
      setSearched(true)
      lastSearch.current = { query, filters, page: 1, action: 'search' }
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
        const results: Video[] = data.slice(0, INITIAL_VIDEO_COUNT).map((v: Record<string, unknown>) => ({
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
        const unseen = await filterSeen(results)
        setVideos(prev => append
          ? [...prev, ...unseen.filter(video => !prev.some(existing => existing.hash === video.hash))]
          : unseen
        )
        lastSearch.current = { query, filters, page, action: 'search' }
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
    setSelectedNiche(null)
    if (contentMode === 'clips') {
      searchClips(query, 'search')
    } else {
      searchVideos(query, filters)
    }
  }, [contentMode, searchClips, searchVideos])

  const handleNicheSelect = useCallback(async (nicheId: string | null) => {
    setSelectedNiche(nicheId)
    setSearchQuery('')
    setContentMode('clips')
    if (nicheId) {
      // Fetch clips then open TikTok player directly
      const cacheKey = `niche_${nicheId}`
      let clipsToPlay = clipCache.get(cacheKey)

      if (!clipsToPlay) {
        setLoading(true)
        try {
          const params = new URLSearchParams({ q: nicheId, action: 'niche', count: '30', page: '1' })
          const res = await fetch(`/api/search-redgifs?${params.toString()}`)
          const data = await res.json()
          if (Array.isArray(data)) {
            clipsToPlay = data.filter((c: Record<string, unknown>) => !c.error).map((c: Record<string, unknown>) => ({
              clipId: String(c.clipId || ''),
              title: String(c.title || ''),
              username: String(c.username || ''),
              thumbnail: c.thumbnail as string | null,
              hdUrl: c.hdUrl as string | null,
              sdUrl: c.sdUrl as string | null,
              preview: c.preview as string | null,
              duration: c.duration as number | null,
              views: c.views as number | null,
              likes: c.likes as number | null,
              tags: (c.tags as string[]) || [],
              verified: Boolean(c.verified),
              site: 'redgifs',
              hash: String(c.hash || ''),
            }))
            clipCache.set(cacheKey, clipsToPlay)
          }
        } catch (err) {
          console.error('Niche fetch failed:', err)
        }
        setLoading(false)
      }

      if (clipsToPlay && clipsToPlay.length > 0) {
        setClips(clipsToPlay)
        setSelectedClipIndex(0)
      }
    }
  }, [])

  const loadMore = useCallback(() => {
    const currentSearch = lastSearch.current
    if (currentSearch && !loadingMore) {
      if (contentMode === 'clips') {
        searchClips(currentSearch.query, currentSearch.action, true, currentSearch.page + 1)
      } else {
        searchVideos(currentSearch.query, currentSearch.filters, currentSearch.page + 1, true)
      }
    }
  }, [loadingMore, contentMode, searchClips, searchVideos])

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    if (!sentinel || !hasMore || loadingMore || loading) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadMore()
      }
    }, {
      rootMargin: '400px 0px',
      threshold: 0.1,
    })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadMore])

  async function handleVideoClick(video: Video) {
    if (video.hash) {
      const isSeen = await filterSeen([video])
      if (isSeen.length === 0) {
        const currentIndex = videos.findIndex(v => v.hash === video.hash)
        const nextVideo = videos[currentIndex + 1]
        if (nextVideo) handleVideoClick(nextVideo)
        return
      }
    }

    setExtracting(true)
    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(video.siteUrl || '')}&hash=${video.hash || ''}`)
      const data = await res.json()

      if (data.streamUrl) {
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
        const currentIndex = videos.findIndex(v => v.hash === video.hash)
        const nextVideo = videos[currentIndex + 1]
        if (nextVideo) handleVideoClick(nextVideo)
      }
    } catch (err) {
      console.error('Extraction failed:', err)
      const currentIndex = videos.findIndex(v => v.hash === video.hash)
      const nextVideo = videos[currentIndex + 1]
      if (nextVideo) handleVideoClick(nextVideo)
    }
    setExtracting(false)
  }

  function handleClipClick(clip: Clip, index: number) {
    setSelectedClipIndex(index)
  }

  const handleBack = useCallback(() => {
    setSelectedVideo(null)
  }, [])

  const toggleContentMode = useCallback(() => {
    setContentMode(prev => {
      const next = prev === 'videos' ? 'clips' : 'videos'
      if (next === 'clips') {
        setSelectedNiche(null)
        setSearchQuery('')
      }
      if (next === 'videos' && videos.length === 0) {
        searchVideos('trending', { sortBy: 'relevance', site: 'all' })
      }
      return next
    })
  }, [clips.length, videos.length, searchClips, searchVideos])

  useEffect(() => {
    if (!searched) {
      if (contentMode === 'videos' && videos.length === 0) {
        searchVideos('trending', { sortBy: 'relevance', site: 'all' })
      }
    }
  }, [contentMode, searched, clips.length, videos.length, searchClips, searchVideos])

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

  if (selectedClipIndex !== null) {
    return (
      <ClipsPlayer
        clips={clips}
        startIndex={selectedClipIndex}
        onClose={() => setSelectedClipIndex(null)}
        nicheName={selectedNiche}
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
          {/* Content Mode Toggle + Search */}
          <div className="mb-6">
            {/* Mode toggle */}
            <div className="flex items-center gap-4 mb-4">
              <div className="inline-flex rounded-lg border border-amber-900/35 bg-[#1c130d]/80 p-1">
                <button
                  onClick={() => setContentMode('videos')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    contentMode === 'videos'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <GridIcon className="w-4 h-4" />
                  Videos
                </button>
                <button
                  onClick={toggleContentMode}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    contentMode === 'clips'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FilmIcon className="w-4 h-4" />
                  Clips
                </button>
              </div>

            </div>

            {/* Search */}
            <SearchAutocomplete
              onSearch={handleSearch}
              placeholder={contentMode === 'clips' ? 'Search clips...' : 'Search videos...'}
              autoFocus
            />

            {/* Niches bar (only in clips mode) */}
            {contentMode === 'clips' && !selectedNiche && !searchQuery.trim() && (
              <div className="mt-4">
                <NichesBar selectedNiche={selectedNiche} onSelect={handleNicheSelect} />
              </div>
            )}
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
          {loading && videos.length === 0 && clips.length === 0 && (contentMode === 'videos' || selectedNiche || searchQuery.trim()) && (
            contentMode === 'clips' ? (
              <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 stagger-children">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="break-inside-avoid mb-3">
                    <div className="bg-gray-900 rounded-xl overflow-hidden animate-slide-up" style={{ aspectRatio: '9/14' }}>
                      <div className="w-full h-full bg-gray-800 animate-shimmer" />
                    </div>
                    <div className="px-1 mt-2 space-y-1.5">
                      <div className="h-3 bg-gray-800 rounded w-2/3 animate-shimmer" />
                      <div className="h-2.5 bg-gray-800 rounded w-1/2 animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
            )
          )}

          {/* Empty State */}
          {!searched && !loading && contentMode === 'videos' && (
            <div className="text-center py-20 text-gray-500">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-lg">Start typing to search</p>
              <p className="text-sm mt-2">Videos from XVideos</p>
            </div>
          )}

          {/* No Results */}
          {searched && !loading && videos.length === 0 && clips.length === 0 && (contentMode === 'videos' || selectedNiche || searchQuery.trim()) && (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg">No new content found</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          )}

          {/* Clips Masonry Grid */}
          {contentMode === 'clips' && (selectedNiche || searchQuery.trim()) && clips.length > 0 && (
            <MasonryGrid clips={clips} onClipClick={handleClipClick} />
          )}

          {/* Videos Grid */}
          {contentMode === 'videos' && videos.length > 0 && (
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

          {/* Load More */}
          {searched && ((contentMode === 'clips' && clips.length > 0) || (contentMode === 'videos' && videos.length > 0)) && hasMore && (
            <>
              <div ref={loadMoreSentinelRef} className="h-10" aria-hidden="true" />
              <div className="flex justify-center py-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-gray-800 rounded-lg text-sm font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50 transition-all cursor-pointer btn-press"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
