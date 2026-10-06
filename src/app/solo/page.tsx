'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlayIcon, HomeIcon, SearchIcon, GridIcon, FilmIcon, DiceIcon } from '@/components/icons'
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
const INITIAL_CLIP_COUNT = 12
const INITIAL_VIDEO_COUNT = 12

const MASHUP_POOL = [
  'Amateur', 'POV', 'Sensual', 'Romance', 'Golden Hour', 'Verified',
  'Blowjob', 'Doggy', 'Cowgirl', 'Brunette', 'Blonde', 'Redhead',
  'Public', 'Masturbation', 'Squirting', 'Creampie', 'Orgasm'
]

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
  const [activeMashup, setActiveMashup] = useState<string | null>(null)
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
    setActiveMashup(null)
    if (contentMode === 'clips') {
      searchClips(query, 'search')
    } else {
      searchVideos(query, filters)
    }
  }, [contentMode, searchClips, searchVideos])

  const handleRollDice = useCallback(() => {
    // Generate a random 2-tag mashup
    const shuffled = [...MASHUP_POOL].sort(() => 0.5 - Math.random())
    const tag1 = shuffled[0]
    const tag2 = shuffled[1]
    const query = `${tag1} ${tag2}`

    setSearchQuery(query)
    setSelectedNiche(null)
    setActiveMashup(`${tag1} × ${tag2}`)

    if (contentMode === 'clips') {
      searchClips(query, 'search')
    } else {
      searchVideos(query, { sortBy: 'relevance', site: 'all' })
    }
  }, [contentMode, searchClips, searchVideos])

  const handleNicheSelect = useCallback(async (nicheId: string | null) => {
    setSelectedNiche(nicheId)
    setSearchQuery('')
    setActiveMashup(null)
    setContentMode('clips')
    if (nicheId) {
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

  // Sentinel Intersection Observer with 400px root margin
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
      setSelectedNiche(null)
      setSearchQuery('')
      setActiveMashup(null)
      if (next === 'clips' && clips.length === 0) {
        searchClips('trending', 'trending')
      } else if (next === 'videos' && videos.length === 0) {
        searchVideos('trending', { sortBy: 'relevance', site: 'all' })
      }
      return next
    })
  }, [clips.length, videos.length, searchClips, searchVideos])

  // Initial Auto-Discovery on mount (No blank states)
  useEffect(() => {
    if (!searched) {
      if (contentMode === 'videos' && videos.length === 0) {
        let initialTopic = 'trending'
        try {
          const stored = sessionStorage.getItem('interests')
          if (stored) {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialTopic = parsed[Math.floor(Math.random() * parsed.length)]
            }
          }
        } catch {}
        searchVideos(initialTopic, { sortBy: 'relevance', site: 'all' })
      } else if (contentMode === 'clips' && clips.length === 0) {
        searchClips('trending', 'trending')
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
      {/* Top Header */}
      <div className="p-4 border-b border-amber-900/30 bg-[#130c07]/85 backdrop-blur-md flex justify-between items-center sticky top-0 z-30">
        <h2 className="text-xl font-serif italic font-medium flex items-center gap-2 text-[#fef9f5]">
          <PlayIcon className="w-5 h-5 text-amber-400" />
          <span>Solo Lounge</span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/queue')}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-xl text-xs md:text-sm font-semibold hover:from-amber-500 hover:to-orange-500 transition cursor-pointer flex items-center gap-2 shadow-md shadow-amber-900/20"
          >
            <SearchIcon className="w-3.5 h-3.5" />
            <span>Find Match</span>
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#261b14] border border-amber-900/35 rounded-xl text-xs md:text-sm hover:bg-[#32231a] transition cursor-pointer flex items-center gap-2 text-[#d4c3b3]"
          >
            <HomeIcon className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Content Mode Toggle + Search + Mashup Dice */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              {/* Content Mode Tabs */}
              <div className="inline-flex rounded-xl border border-amber-900/35 bg-[#1c130d]/80 p-1">
                <button
                  onClick={() => { if (contentMode !== 'videos') toggleContentMode() }}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    contentMode === 'videos'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-950/40'
                      : 'text-[#a89582] hover:text-[#f5ebe0]'
                  }`}
                >
                  <GridIcon className="w-4 h-4" />
                  <span>Videos</span>
                </button>
                <button
                  onClick={() => { if (contentMode !== 'clips') toggleContentMode() }}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    contentMode === 'clips'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-950/40'
                      : 'text-[#a89582] hover:text-[#f5ebe0]'
                  }`}
                >
                  <FilmIcon className="w-4 h-4" />
                  <span>Clips</span>
                </button>
              </div>

              {/* Status / Discovery Hint */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-amber-400/80 font-serif italic">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Curated discovery stream</span>
              </div>
            </div>

            {/* Search Input & Mashup Dice */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SearchAutocomplete
                  onSearch={handleSearch}
                  placeholder={contentMode === 'clips' ? 'Search clips or genres...' : 'Search videos or moods...'}
                  autoFocus
                />
              </div>

              {/* Mashup Dice Discovery Button */}
              <button
                type="button"
                onClick={handleRollDice}
                title="Roll Mashup Dice (Surprise Discovery)"
                className="px-4 py-3 bg-gradient-to-r from-amber-600/20 via-orange-600/20 to-amber-600/20 hover:from-amber-600/35 hover:to-orange-600/35 border border-amber-500/40 text-amber-300 hover:text-amber-100 rounded-2xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2 cursor-pointer btn-press shrink-0"
              >
                <DiceIcon className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Mashup</span>
              </button>
            </div>

            {/* Active Mashup Badge */}
            {activeMashup && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/40 py-1.5 px-3.5 rounded-full w-fit">
                <DiceIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Currently exploring mashup: <strong>{activeMashup}</strong></span>
                <button 
                  onClick={() => setActiveMashup(null)} 
                  className="ml-1 text-amber-400/60 hover:text-amber-200 cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            {/* Niches bar (only in clips mode) */}
            {contentMode === 'clips' && !selectedNiche && !searchQuery.trim() && !activeMashup && (
              <div className="mt-4">
                <NichesBar selectedNiche={selectedNiche} onSelect={handleNicheSelect} />
              </div>
            )}
          </div>

          {/* Extracting Private Stream Overlay */}
          {extracting && (
            <div className="fixed inset-0 bg-[#0e0a07]/85 z-40 flex items-center justify-center backdrop-blur-md">
              <div className="text-center animate-scale-in bg-[#1c130d]/90 border border-amber-900/40 p-8 rounded-3xl shadow-2xl shadow-black/80 max-w-sm mx-4">
                <div className="relative w-12 h-12 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-900/30" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-500 animate-spin" />
                </div>
                <p className="text-base font-serif italic text-[#f5ebe0]">Connecting private stream...</p>
                <p className="text-xs text-[#a89582] mt-1 font-light">Discreet & ephemeral viewing</p>
              </div>
            </div>
          )}

          {/* Obsidian & Amber Skeleton Loading System */}
          {loading && videos.length === 0 && clips.length === 0 && (
            contentMode === 'clips' ? (
              <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 stagger-children">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="break-inside-avoid mb-3">
                    <div className="bg-[#1c130d] border border-amber-900/30 rounded-2xl overflow-hidden animate-slide-up" style={{ aspectRatio: '9/16' }}>
                      <div className="w-full h-full bg-gradient-to-tr from-amber-950/20 via-amber-600/10 to-transparent animate-pulse" />
                    </div>
                    <div className="px-1 mt-2 space-y-1.5">
                      <div className="h-3 bg-amber-950/60 rounded-md w-2/3 animate-pulse" />
                      <div className="h-2.5 bg-amber-950/40 rounded-md w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-[#1c130d] border border-amber-900/30 rounded-2xl overflow-hidden animate-slide-up shadow-md">
                    <div className="aspect-video bg-gradient-to-tr from-amber-950/20 via-amber-600/10 to-transparent animate-pulse" />
                    <div className="p-3 space-y-2">
                      <div className="h-3.5 bg-amber-950/60 rounded-md w-3/4 animate-pulse" />
                      <div className="h-2.5 bg-amber-950/40 rounded-md w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* No Results Fallback */}
          {searched && !loading && videos.length === 0 && clips.length === 0 && (
            <div className="text-center py-20 text-[#a89582]">
              <SearchIcon className="w-12 h-12 mx-auto mb-3 text-amber-500/40" />
              <p className="text-base font-serif italic text-[#f5ebe0]">No unseen content found for this search</p>
              <p className="text-xs mt-1 text-[#8c7867]">Try rolling the Mashup Dice or entering a different mood</p>
              <button
                onClick={handleRollDice}
                className="mt-4 px-5 py-2.5 bg-[#241a13] border border-amber-900/40 rounded-xl text-xs text-amber-300 hover:text-amber-100 hover:border-amber-700/60 transition cursor-pointer"
              >
                Roll Mashup Dice
              </button>
            </div>
          )}

          {/* Clips Masonry Grid */}
          {contentMode === 'clips' && clips.length > 0 && (
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

          {/* Load More & Infinite Scroll Sentinel */}
          {searched && ((contentMode === 'clips' && clips.length > 0) || (contentMode === 'videos' && videos.length > 0)) && hasMore && (
            <>
              <div ref={loadMoreSentinelRef} className="h-10" aria-hidden="true" />
              <div className="flex justify-center py-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3.5 bg-[#231811] hover:bg-[#2d2017] border border-amber-900/40 hover:border-amber-700/60 rounded-2xl text-xs md:text-sm font-medium text-[#f5ebe0] shadow-md hover:shadow-amber-900/20 disabled:opacity-50 transition-all cursor-pointer btn-press flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <span>Discover More</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
