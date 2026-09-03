'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, PlayIcon, BackIcon, HomeIcon } from '@/components/icons'

const videoCache = new Map<string, Record<string, unknown>[]>()

export default function Solo() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [videos, setVideos] = useState<Record<string, unknown>[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [volume, setVolume] = useState(80)
  const [searched, setSearched] = useState(false)

  const searchVideos = useCallback(async (query: string) => {
    if (!query.trim()) return
    
    // Check cache first
    if (videoCache.has(query)) {
      setVideos(videoCache.get(query)!)
      setSearched(true)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      const results = Array.isArray(data) ? data.slice(0, 18) : []
      videoCache.set(query, results)
      setVideos(results)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  // Instant search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchVideos(searchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchVideos])

  const selectVideo = (video: Record<string, unknown>) => {
    setSelectedVideo(video)
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
                placeholder="Type to search instantly..."
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
                <p className="text-sm mt-2">Results appear instantly</p>
              </div>
            )}

            {/* No Results */}
            {searched && !loading && videos.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg">No results found</p>
                <p className="text-sm mt-2">Try different keywords</p>
              </div>
            )}

            {/* Video Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video, i) => (
                <div 
                  key={i} 
                  onClick={() => selectVideo(video)}
                  className="bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all duration-200 cursor-pointer group hover:scale-[1.02]"
                >
                  <div className="aspect-video bg-gray-800 relative overflow-hidden">
                    {video.thumbnail ? (
                      <>
                        <img 
                          src={video.thumbnail as string} 
                          alt="" 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <PlayIcon className="w-6 h-6 text-white ml-1" />
                          </div>
                        </div>
                        {video.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-medium">
                            {String(video.duration)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayIcon className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-purple-400 transition-colors">
                      {String(video.title || 'Untitled')}
                    </h3>
                    {video.views && (
                      <p className="text-xs text-gray-500 mt-1">{String(video.views)} views</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Video Player - Instant Load */
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
            src={`https://www.pornhub.com/embed/${String(selectedVideo.videoId)}?autoplay=1`}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
            frameBorder={0}
          />

          {/* Video Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-6">
            <h3 className="text-lg font-semibold mb-1">{String(selectedVideo.title)}</h3>
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