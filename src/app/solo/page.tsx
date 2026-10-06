'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlayIcon,
  HomeIcon,
  SearchIcon,
  GridIcon,
  FilmIcon,
  DiceIcon,
  HeartIcon,
} from '@/components/icons'
import SearchAutocomplete, { SearchFilters } from '@/components/SearchAutocomplete'
import { MediaCard, MediaItem } from '@/components/MediaCard'
import { Skeleton } from '@/components/ui/Skeleton'
import ClipsPlayer from '@/components/ClipsPlayer'
import NichesBar from '@/components/NichesBar'
import { filterSeen } from '@/utils/dedup'
import { saveToVault, removeFromVault, getVaultItems, VaultItem } from '@/utils/vault'
import { haptics } from '@/utils/haptics'
import { useToast } from '@/components/ui/Toast'
import { useSanctuary } from '@/context/SanctuaryContext'
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

const videoCache = new Map<string, Video[]>()
const clipCache = new Map<string, Clip[]>()
const INITIAL_BATCH = 12

const MASHUP_POOL = [
  'Amateur', 'POV', 'Sensual', 'Romance', 'Golden Hour', 'Verified',
  'Blowjob', 'Doggy', 'Cowgirl', 'Brunette', 'Blonde', 'Redhead',
  'Public', 'Masturbation', 'Squirting', 'Creampie', 'Orgasm'
]

export default function SoloLounge() {
  const router = useRouter()
  const { toast } = useToast()
  const { state: sanctuaryState, setVaultCount } = useSanctuary()

  const [videos, setVideos] = useState<Video[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMashup, setActiveMashup] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [contentMode, setContentMode] = useState<'videos' | 'clips'>('videos')
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null)
  const [isRollingDice, setIsRollingDice] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [vaultHashes, setVaultHashes] = useState<Set<string>>(new Set())

  const lastSearch = useRef<{
    query: string
    filters: SearchFilters
    page: number
    action: 'search' | 'trending' | 'niche'
  } | null>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)

  // Refresh Vault Hashes on Mount
  useEffect(() => {
    const checkVault = async () => {
      try {
        const stored: VaultItem[] = await getVaultItems()
        const hashes = new Set<string>(stored.map((c) => c.id))
        setVaultHashes(hashes)
        setVaultCount(hashes.size)
      } catch {}
    }
    checkVault()
  }, [setVaultCount])

  // Track Scroll for "Back to top"
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 800)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    haptics.lightTap()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Clips Search
  const searchClips = useCallback(
    async (query: string, action: string = 'search', append = false, page = 1) => {
      if (!query.trim() && action === 'search') return

      if (append) setLoadingMore(true)
      else
        lastSearch.current = {
          query,
          filters: { sortBy: 'relevance', site: 'all' },
          page: 1,
          action: action === 'niche' ? 'niche' : action === 'trending' ? 'trending' : 'search',
        }

      if (!append && clipCache.has(`${action}_${query}`)) {
        const cached = clipCache.get(`${action}_${query}`)!
        setClips(cached)
        setSearched(true)
        setHasMore(cached.length >= INITIAL_BATCH)
        return
      }

      setLoading(true)
      setSearched(true)
      try {
        const params = new URLSearchParams({
          q: query,
          action,
          count: String(INITIAL_BATCH),
          page: String(page),
        })
        const res = await fetch(`/api/search-redgifs?${params.toString()}`)
        const data = await res.json()

        if (Array.isArray(data)) {
          const results: Clip[] = data
            .filter((c: Record<string, unknown>) => !c.error)
            .map((c: Record<string, unknown>) => ({
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
          setClips((prev) =>
            append
              ? [...prev, ...results.filter((c) => !prev.some((e) => e.clipId === c.clipId))]
              : results
          )
          if (!append) {
            lastSearch.current = {
              query,
              filters: { sortBy: 'relevance', site: 'all' },
              page,
              action: action === 'niche' ? 'niche' : action === 'trending' ? 'trending' : 'search',
            }
          } else if (lastSearch.current) {
            lastSearch.current.page = page
          }
          setHasMore(data.length >= INITIAL_BATCH)
        }
      } catch (err) {
        console.error('Clip search failed:', err)
        toast({ title: 'Discovery interrupted', description: 'Could not fetch clips', variant: 'alert' })
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [toast]
  )

  // Videos Search
  const searchVideos = useCallback(
    async (query: string, filters: SearchFilters, page = 1, append = false) => {
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
          const results: Video[] = data.slice(0, INITIAL_BATCH).map((v: Record<string, unknown>) => ({
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
          setVideos((prev) =>
            append
              ? [...prev, ...unseen.filter((video) => !prev.some((existing) => existing.hash === video.hash))]
              : unseen
          )
          lastSearch.current = { query, filters, page, action: 'search' }
          setHasMore(data.length > 0)
        }
      } catch (err) {
        console.error('Search failed:', err)
        toast({ title: 'Stream search stalled', description: 'Check connection', variant: 'alert' })
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [toast]
  )

  const handleSearch = useCallback(
    (query: string, filters: SearchFilters) => {
      setSearchQuery(query)
      setSelectedNiche(null)
      setActiveMashup(null)
      if (contentMode === 'clips') {
        searchClips(query, 'search')
      } else {
        searchVideos(query, filters)
      }
    },
    [contentMode, searchClips, searchVideos]
  )

  // 3D Tumble Mashup Dice Roll [Q38]
  const handleRollDice = useCallback(() => {
    setIsRollingDice(true)
    haptics.confirm()

    setTimeout(() => {
      const shuffled = [...MASHUP_POOL].sort(() => 0.5 - Math.random())
      const tag1 = shuffled[0]
      const tag2 = shuffled[1]
      const query = `${tag1} ${tag2}`

      setSearchQuery(query)
      setSelectedNiche(null)
      setActiveMashup(`${tag1} × ${tag2}`)
      setIsRollingDice(false)

      toast({
        title: `Mashup Unlocked: ${tag1} × ${tag2}`,
        description: 'Generating spontaneous desire feed',
        variant: 'info',
      })

      if (contentMode === 'clips') {
        searchClips(query, 'search')
      } else {
        searchVideos(query, { sortBy: 'relevance', site: 'all' })
      }
    }, 450)
  }, [contentMode, searchClips, searchVideos, toast])

  const handleNicheSelect = useCallback(
    async (nicheId: string | null) => {
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
            const params = new URLSearchParams({ q: nicheId, action: 'niche', count: '24', page: '1' })
            const res = await fetch(`/api/search-redgifs?${params.toString()}`)
            const data = await res.json()
            if (Array.isArray(data)) {
              clipsToPlay = data
                .filter((c: Record<string, unknown>) => !c.error)
                .map((c: Record<string, unknown>) => ({
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
    },
    []
  )

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

  // Sentinel Infinite Scroll Observer [Q39]
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    if (!sentinel || !hasMore || loadingMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      {
        rootMargin: '500px 0px',
        threshold: 0.1,
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadMore])

  // Navigate to dedicated Video Page instead of inline overlay [Video Page Redesign]
  async function handleMediaSelect(item: MediaItem) {
    if (contentMode === 'clips') {
      const idx = clips.findIndex((c) => c.clipId === item.id || c.hash === item.hash)
      if (idx !== -1) setSelectedClipIndex(idx)
      return
    }

    const video = videos.find((v) => v.videoId === item.id || v.hash === item.hash)
    if (!video) return

    haptics.confirm()

    // Navigate to the dedicated video page — extraction happens there
    const params = new URLSearchParams({
      url: video.siteUrl || '',
      hash: video.hash || '',
      title: video.title || '',
      thumb: video.thumbnail || '',
      dur: video.duration || '',
      site: video.site || '',
      vid: video.videoId || '',
    })
    router.push(`/video?${params.toString()}`)
  }

  // Vault Save/Unsave Toggle [Q180]
  const handleToggleVault = async (item: MediaItem) => {
    const vaultId = item.hash || item.id
    if (!vaultId) return
    const isAlreadySaved = vaultHashes.has(vaultId)

    if (isAlreadySaved) {
      await removeFromVault(vaultId)
      setVaultHashes((prev) => {
        const next = new Set(prev)
        next.delete(vaultId)
        setVaultCount(next.size)
        return next
      })
      toast({ title: 'Removed from Vault', variant: 'info' })
    } else {
      const success = await saveToVault({
        id: vaultId,
        title: item.title,
        thumbnail: item.thumbnail || '',
        streamUrl: '',
        site: item.site || 'video',
        duration: typeof item.duration === 'string' ? item.duration : item.duration || undefined,
      })
      if (success) {
        setVaultHashes((prev) => {
          const next = new Set(prev).add(vaultId)
          setVaultCount(next.size)
          return next
        })
        toast({ title: 'Saved to Encrypted Vault', description: 'Available offline (up to 5 clips)', variant: 'success' })
      } else {
        toast({ title: 'Vault Full (Cap 5)', description: 'Remove an older clip to save new ones', variant: 'alert' })
      }
    }
  }

  // Initial Auto-Discovery on mount
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
    <div className="min-h-dvh bg-[#0e0a07] text-[#f5ebe0] pb-24 selection:bg-amber-700/30 selection:text-amber-200">
      {/* Minimal Floating Glass Top Bar [Q13] */}
      <header className="sticky top-3 z-40 px-3 sm:px-6">
        <div className="max-w-5xl mx-auto bg-[#160e0a]/85 backdrop-blur-xl border border-amber-900/30 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center justify-between gap-3">
          {/* Logo / Brand Title */}
          <div className="flex items-center gap-2 pl-2 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-black font-serif font-black shadow-md shadow-amber-950/40">
              C
            </div>
            <span className="hidden sm:inline font-serif italic text-sm tracking-wide text-[#fef9f5]">
              CHATAway <span className="text-[10px] text-amber-400 not-italic uppercase tracking-widest font-mono">Solo</span>
            </span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg">
            <SearchAutocomplete
              onSearch={handleSearch}
              placeholder={contentMode === 'clips' ? 'Explore erotic clips or tags...' : 'Search scenes, moods, desires...'}
            />
          </div>

          {/* Quick Actions (Dice & Match) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleRollDice}
              title="Roll Mashup Dice [Q38]"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/40 border border-amber-900/40 text-amber-300 hover:text-amber-100 transition cursor-pointer btn-press flex items-center gap-1.5"
            >
              <DiceIcon className={`w-4 h-4 text-amber-400 ${isRollingDice ? 'animate-dice-tumble' : ''}`} />
              <span className="hidden md:inline text-xs font-semibold uppercase tracking-wider">Dice</span>
            </button>

            <button
              onClick={() => router.push('/queue')}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white font-medium text-xs sm:text-sm hover:from-amber-500 hover:to-orange-500 transition shadow-lg shadow-amber-950/50 cursor-pointer btn-press flex items-center gap-1.5"
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pair Up</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-5">
        {/* Content Mode Switcher (Videos / Clips) & Active Mashup Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="inline-flex rounded-xl bg-[#160e0a] border border-amber-900/30 p-1">
            <button
              onClick={() => {
                if (contentMode !== 'videos') {
                  setContentMode('videos')
                  if (videos.length === 0) searchVideos('trending', { sortBy: 'relevance', site: 'all' })
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                contentMode === 'videos'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-[#a89582] hover:text-[#f5ebe0]'
              }`}
            >
              <GridIcon className="w-3.5 h-3.5" />
              <span>Full Scenes</span>
            </button>
            <button
              onClick={() => {
                if (contentMode !== 'clips') {
                  setContentMode('clips')
                  if (clips.length === 0) searchClips('trending', 'trending')
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                contentMode === 'clips'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-[#a89582] hover:text-[#f5ebe0]'
              }`}
            >
              <FilmIcon className="w-3.5 h-3.5" />
              <span>Clips</span>
            </button>
          </div>

          {/* Active Mashup Badge */}
          {activeMashup && (
            <div className="flex items-center gap-2 text-xs text-amber-200 bg-amber-950/50 border border-amber-800/40 py-1 px-3 rounded-full animate-slide-up">
              <DiceIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Mood: <strong>{activeMashup}</strong></span>
              <button
                onClick={() => setActiveMashup(null)}
                className="ml-1 text-amber-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Revamped Niches & Live Video Category Previews Bar [Q14] */}
        {contentMode === 'clips' && !searchQuery.trim() && !activeMashup && (
          <NichesBar selectedNiche={selectedNiche} onSelect={handleNicheSelect} />
        )}

        {/* Shimmer Skeleton Loading Grid [Q09] */}
        {loading && videos.length === 0 && clips.length === 0 && (
          <div className="sanctuary-columns stagger-children">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="break-inside-avoid mb-3">
                <Skeleton
                  variant="card"
                  aspectRatio={contentMode === 'clips' ? 'portrait' : 'video'}
                  className="rounded-2xl"
                />
                <div className="p-2 space-y-1.5">
                  <Skeleton variant="text" className="w-3/4 h-3 rounded" />
                  <Skeleton variant="text" className="w-1/2 h-2.5 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State [Q25] */}
        {searched && !loading && videos.length === 0 && clips.length === 0 && (
          <div className="text-center py-24 glass-panel rounded-3xl p-8 max-w-md mx-auto my-8 animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-amber-950/60 border border-amber-900/40 flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-6 h-6 text-amber-400/80" />
            </div>
            <h3 className="text-lg font-serif italic text-[#fef9f5] mb-2">No unseen content found</h3>
            <p className="text-xs text-[#a89582] mb-6">
              Every scene matching this mood has already passed your eyes. Try rolling the mashup dice for an unexpected pairing.
            </p>
            <button
              onClick={handleRollDice}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-semibold shadow-lg shadow-amber-950/50 hover:from-amber-500 hover:to-orange-500 transition cursor-pointer btn-press"
            >
              Roll Mashup Dice
            </button>
          </div>
        )}

        {/* Unified Media Grid via Native CSS Columns [Q32] */}
        {!loading && (
          <div className="sanctuary-columns stagger-children">
            {contentMode === 'clips'
              ? clips.map((clip) => (
                  <div key={clip.clipId || clip.hash} className="break-inside-avoid mb-3 animate-slide-up">
                    <MediaCard
                      item={{
                        id: clip.clipId,
                        title: clip.title,
                        thumbnail: clip.thumbnail,
                        preview: clip.preview,
                        duration: clip.duration,
                        views: clip.views,
                        likes: clip.likes,
                        site: clip.site,
                        hash: clip.hash,
                        username: clip.username,
                        tags: clip.tags,
                      }}
                      variant="clip"
                      isSaved={vaultHashes.has(clip.hash)}
                      onSelect={handleMediaSelect}
                      onToggleSave={handleToggleVault}
                    />
                  </div>
                ))
              : videos.map((video) => (
                  <div key={video.hash || video.videoId} className="break-inside-avoid mb-3 animate-slide-up">
                    <MediaCard
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
                      isSaved={vaultHashes.has(video.hash || '')}
                      onSelect={handleMediaSelect}
                      onToggleSave={handleToggleVault}
                    />
                  </div>
                ))}
          </div>
        )}

        {/* Sentinel Infinite Scroll Target [Q39] */}
        {hasMore && <div ref={loadMoreSentinelRef} className="h-16" />}

        {/* Floating Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-20 right-6 z-40 p-3 rounded-full bg-[#160e0a]/90 border border-amber-900/40 text-amber-300 shadow-xl backdrop-blur-md hover:bg-amber-950/60 transition cursor-pointer btn-press animate-scale-in"
            title="Back to top"
          >
            ↑
          </button>
        )}
      </main>

      {/* Floating Bottom Navigation Capsule [Q24] */}
      <nav className="fixed bottom-4 inset-x-0 z-40 px-4 pointer-events-none">
        <div className="max-w-xs mx-auto bg-[#160e0a]/90 backdrop-blur-2xl border border-amber-900/35 rounded-full p-1.5 shadow-2xl flex items-center justify-around pointer-events-auto">
          <button
            onClick={() => router.push('/')}
            className="p-2.5 rounded-full text-[#a89582] hover:text-[#f5ebe0] transition cursor-pointer btn-press"
            title="Sanctuary Home"
          >
            <HomeIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
              haptics.lightTap()
            }}
            className="p-2.5 rounded-full text-amber-400 bg-amber-950/50 border border-amber-900/40 shadow-md transition cursor-pointer btn-press"
            title="Solo Lounge (Current)"
          >
            <FilmIcon className="w-5 h-5" />
          </button>

          <button
            onClick={handleRollDice}
            className="p-2.5 rounded-full text-[#a89582] hover:text-amber-300 transition cursor-pointer btn-press"
            title="Roll Mashup Dice"
          >
            <DiceIcon className={`w-5 h-5 ${isRollingDice ? 'animate-dice-tumble' : ''}`} />
          </button>

          <button
            onClick={() => router.push('/queue')}
            className="p-2.5 rounded-full text-[#a89582] hover:text-[#f5ebe0] transition cursor-pointer btn-press"
            title="Find Partner Match"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </div>
  )
}
