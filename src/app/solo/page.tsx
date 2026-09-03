'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, PlayIcon, PauseIcon, VolumeIcon, BackIcon, HomeIcon, VideoIcon } from '@/components/icons'

export default function Solo() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [videos, setVideos] = useState<Record<string, unknown>[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Record<string, unknown> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [volume, setVolume] = useState(80)

  const searchVideos = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setVideos(Array.isArray(data) ? data.slice(0, 18) : [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PlayIcon className="w-6 h-6" /> Solo Mode
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
        /* Video Browser */
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-4 mb-8">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchVideos()}
                placeholder="Search videos..."
                className="flex-1 px-6 py-4 bg-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={searchVideos}
                disabled={loading}
                className="px-8 py-4 bg-purple-600 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <SearchIcon className="w-5 h-5" /> {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {videos.length === 0 && !loading && (
              <div className="text-center py-20 text-gray-500">
                <SearchIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-lg">Search for something to watch</p>
                <p className="text-sm mt-2">Try: amateur, milf, teen, etc.</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedVideo(video)}
                  className="bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition cursor-pointer group"
                >
                  <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                    {video.thumbnail ? (
                      <>
                        <img src={video.thumbnail as string} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <PlayIcon className="w-12 h-12" />
                        </div>
                      </>
                    ) : (
                      <VideoIcon className="w-12 h-12 text-gray-600" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2">{String(video.title || 'Untitled')}</h3>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      {video.duration && <span>{String(video.duration)}</span>}
                      {video.views && <span>{String(video.views)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Video Player */
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] p-6">
          <div className="w-full max-w-5xl">
            {/* Player */}
            <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden">
              <iframe
                src={`https://www.pornhub.com/embed/${String(selectedVideo.videoId)}`}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
                frameBorder={0}
              />
            </div>

            {/* Info & Controls */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{String(selectedVideo.title)}</h3>
                <div className="flex gap-4 text-sm text-gray-400">
                  {selectedVideo.duration && <span>{String(selectedVideo.duration)}</span>}
                  {selectedVideo.views && <span>{String(selectedVideo.views)}</span>}
                  {selectedVideo.rating && <span>{String(selectedVideo.rating)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <VolumeIcon className="w-5 h-5 text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition cursor-pointer flex items-center gap-2"
                >
                  <BackIcon className="w-5 h-5" /> Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}