'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, PlayIcon, BackIcon, HomeIcon } from '@/components/icons'

const videoCache = new Map<string, Record<string, unknown>[]>()

interface VideoWithPreview extends Record<string, unknown> {
  videoId: string
  thumbnail: string
  title: string
  duration?: string
  views?: string
  rating?: string
  previewThumbs?: string[]
}

export default function Solo() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [videos, setVideos] = useState<VideoWithPreview[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoWithPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [volume, setVolume] = useState(80)
  const [searched, setSearched] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [previewFrame, setPreviewFrame] = useState(0)
  const previewInterval = useRef<NodeJS.Timeout | null>(null)

  const searchVideos = useCallback(async (query: string) => {
    if (!query.trim()) return
    
    if (videoCache.has(query)) {
      setVideos(videoCache.get(query) as VideoWithPreview[])
      setSearched(true)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      const results: VideoWithPreview[] = (Array.isArray(data) ? data.slice(0, 18) : []).map((v: Record<string, unknown>) => ({
        ...v,
        videoId: String(v.videoId || ''),
        thumbnail: String(v.thumbnail || ''),
        title: String(v.title || 'Untitled'),
        previewThumbs: generatePreviewThumbs(String(v.thumbnail || ''))
      }))
      videoCache.set(query, results)
      setVideos(results)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  // Generate preview thumbnail variants from main thumbnail
  const generatePreviewThumbs = (thumbUrl: string): string[] => {
    if (!thumbUrl) return []
    // Pornhub thumbnails usually have numbered variants
    const thumbs = []
    for (let i = 1; i <= 8; i++) {
      thumbs.push(thumbUrl.replace(/\d+\.jpg/, `${i}.jpg`))
    }
    return thumbs
  }

  // Animate preview on hover
  useEffect(() => {
    if (hoveredIndex !== null) {
      setPreviewFrame(0)
      previewInterval.current = setInterval(() => {
        setPreviewFrame(prev => (prev + 1) % 8)
      }, 150)
    } else {
      if (previewInterval.current) {
        clearInterval(previewInterval.current)
        previewInterval.current = null
      }
    }
    return () => {
      if (previewInterval.current) clearInterval(previewInterval.current)
    }
  }, [hoveredIndex])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchVideos(searchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchVideos])

  const selectVideo = (video: VideoWithPreview) => {
    setSelectedVideo(video)
  }

  const getPreviewThumb = (video: VideoWithPreview, frame: number): string => {
    if (video.previewThumbs && video.previewThumbs[frame]) {
      return video.previewThumbs[frame]
    }
    return video.thumbnail
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

      {!selectedVideo ? (
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            {/* Search */}
            <div className="relative mb-8">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <SearchIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-12 pr-6 py-4 bg-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                autoFocus
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Skeleton Loading */}
            {loading && videos.length === 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-900 rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-video bg-gray-800"></div>
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-800 rounded w-1/2"></div>
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
                <p className="text-sm mt-2">Hover over videos for preview</p>
              </div>
            )}

            {/* No Results */}
            {searched && !loading && videos.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg">No results found</p>
              </div>
            )}

            {/* Video Grid with Hover Preview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video, i) => (
                <div 
                  key={i} 
                  onClick={() => selectVideo(video)}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all duration-200 cursor-pointer group"
                >
                  <div className="aspect-video bg-gray-800 relative overflow-hidden">
                    {video.thumbnail ? (
                      <>
                        {/* Main Thumbnail */}
                        <img 
                          src={hoveredIndex === i ? getPreviewThumb(video, previewFrame) : video.thumbnail}
                          alt="" 
                          className={`w-full h-full object-cover transition-all duration-200 ${
                            hoveredIndex === i ? 'scale-110 brightness-110' : 'group-hover:scale-105'
                          }`}
                          loading="lazy"
                        />
                        
                        {/* Hover Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
                          hoveredIndex === i ? 'opacity-100' : 'opacity-0'
                        }`}></div>
                        
                        {/* Play Button - Always visible on hover */}
                        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                          hoveredIndex === i ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                        }`}>
                          <div className="w-14 h-14 bg-purple-600/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <PlayIcon className="w-7 h-7 text-white ml-1" />
                          </div>
                        </div>

                        {/* Preview Frame Indicator */}
                        {hoveredIndex === i && (
                          <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                            {[...Array(8)].map((_, frame) => (
                              <div 
                                key={frame}
                                className={`h-1 flex-1 rounded-full transition-all duration-150 ${
                                  frame === previewFrame ? 'bg-purple-500' : 'bg-white/30'
                                }`}
                              />
                            ))}
                          </div>
                        )}

                        {/* Duration Badge */}
                        {video.duration && (
                          <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-medium">
                            {String(video.duration)}
                          </div>
                        )}

                        {/* Rating Badge */}
                        {video.rating && (
                          <div className="absolute top-2 left-2 bg-yellow-500/90 px-2 py-1 rounded text-xs font-bold text-black">
                            {String(video.rating)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayIcon className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                  </div>
                  
                  {/* Video Info */}
                  <div className="p-3">
                    <h3 className={`font-medium text-sm line-clamp-2 transition-colors ${
                      hoveredIndex === i ? 'text-purple-400' : 'text-white'
                    }`}>
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      {video.views && <span>{String(video.views)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Video Player - Instant */
        <div className="fixed inset-0 bg-black z-50">
          {/* Back Button */}
          <button 
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 left-4 z-50 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition cursor-pointer flex items-center gap-2"
          >
            <BackIcon className="w-5 h-5" /> Back
          </button>

          {/* Full Screen Player */}
          <iframe
            src={`https://www.pornhub.com/embed/${selectedVideo.videoId}?autoplay=1`}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
            frameBorder={0}
          />

          {/* Video Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-6 pointer-events-none">
            <h3 className="text-lg font-semibold mb-1">{selectedVideo.title}</h3>
            <div className="flex gap-4 text-sm text-gray-400">
              {selectedVideo.duration && <span>{String(selectedVideo.duration)}</span>}
              {selectedVideo.views && <span>{String(selectedVideo.views)}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}