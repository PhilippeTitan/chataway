'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CloseIcon, ChatIcon, VideoIcon, SearchIcon } from '@/components/icons'
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

export default function Watch() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoWithStream | null>(null)
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([
    { sender: 'them', text: 'Pick something hot!' }
  ])
  const [input, setInput] = useState('')
  const [searched, setSearched] = useState(false)

  const searchVideos = useCallback(async (query: string, filters: SearchFilters) => {
    if (!query.trim()) return

    // Create cache key including filters
    const cacheKey = `${query}_${filters.sortBy}_${filters.site}`

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
        const results: Video[] = data.slice(0, 12).map((v: Record<string, unknown>) => ({
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
        const unseen = await filterSeen(results)
        setVideos(unseen)
      }
    } catch (err) {
      console.error('Search failed:', err)
    }
    setLoading(false)
  }, [])

  const handleSearch = useCallback((query: string, filters: SearchFilters) => {
    searchVideos(query, filters)
  }, [searchVideos])

  const handleVideoClick = useCallback(async (video: Video) => {
    // Check if already seen
    if (video.hash) {
      const isSeen = await filterSeen([video])
      if (isSeen.length === 0) {
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
        if (video.hash && video.site && video.videoId) {
          await markSeen(video)
        }

        setSelectedVideo({
          ...video,
          streamUrl: data.streamUrl,
          thumbnail: data.thumbnail || video.thumbnail,
          formats: data.formats,
        })
        setMessages(prev => [...prev, { sender: 'them', text: 'Nice choice!' }])
      } else {
        console.warn('Extraction failed, skipping to next video')
        const currentIndex = videos.findIndex(v => v.hash === video.hash)
        const nextVideo = videos[currentIndex + 1]
        if (nextVideo) {
          handleVideoClick(nextVideo)
        }
      }
    } catch (err) {
      console.error('Extraction failed:', err)
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

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { sender: 'me', text: input }])
    setInput('')
  }

  // If video is selected, show player
  if (selectedVideo && selectedVideo.streamUrl) {
    return (
      <div className="h-screen bg-black text-white flex">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <VideoPlayer
            streamUrl={selectedVideo.streamUrl}
            thumbnail={selectedVideo.thumbnail || ''}
            title={selectedVideo.title}
            duration={selectedVideo.duration || undefined}
            onBack={handleBack}
            formats={selectedVideo.formats}
          />
        </div>

        {/* Side Chat */}
        {chatOpen && (
          <div className="w-80 border-l border-gray-800 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-800 flex justify-between items-center">
              <span className="font-semibold text-sm flex items-center gap-2">
                <ChatIcon className="w-4 h-4" /> Live Chat
              </span>
              <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`text-sm ${msg.sender === 'me' ? 'text-right' : ''}`}>
                  <span className={msg.sender === 'me' ? 'text-blue-400' : 'text-pink-400'}>
                    {msg.sender === 'me' ? 'You' : 'Them'}:
                  </span>{' '}
                  <span className="text-gray-300">{msg.text}</span>
                </div>
              ))}
            </div>
            
            <div className="p-3 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Chat..."
                  className="flex-1 px-3 py-2 bg-gray-800 rounded text-sm text-white placeholder-gray-500 focus:outline-none"
                />
                <button onClick={sendMessage} className="px-3 py-2 bg-blue-600 rounded text-sm cursor-pointer hover:bg-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {!chatOpen && (
          <button 
            onClick={() => setChatOpen(true)}
            className="fixed bottom-4 right-4 px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition cursor-pointer flex items-center gap-2"
          >
            <ChatIcon className="w-5 h-5" /> Open Chat
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen bg-black text-white flex">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <VideoIcon className="w-6 h-6 text-purple-500" /> Watch Together
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/chat')}
              className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 transition cursor-pointer flex items-center gap-2"
            >
              <ChatIcon className="w-4 h-4" /> Chat Only
            </button>
            <button 
              onClick={() => router.push('/end')}
              className="px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition cursor-pointer flex items-center gap-2"
            >
              <CloseIcon className="w-4 h-4" /> End
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Extracting overlay */}
          {extracting && (
            <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-300">Loading video...</p>
              </div>
            </div>
          )}

          {/* Autocomplete Search */}
          <div className="mb-6">
            <SearchAutocomplete
              onSearch={handleSearch}
              placeholder="Search videos to watch together..."
              autoFocus
            />
          </div>

          {/* Loading skeleton */}
          {loading && videos.length === 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
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
              <p className="text-lg">Search for videos to watch together</p>
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Side Chat */}
      {chatOpen && (
        <div className="w-80 border-l border-gray-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center">
            <span className="font-semibold text-sm flex items-center gap-2">
              <ChatIcon className="w-4 h-4" /> Live Chat
            </span>
            <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.sender === 'me' ? 'text-right' : ''}`}>
                <span className={msg.sender === 'me' ? 'text-blue-400' : 'text-pink-400'}>
                  {msg.sender === 'me' ? 'You' : 'Them'}:
                </span>{' '}
                <span className="text-gray-300">{msg.text}</span>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Chat..."
                className="flex-1 px-3 py-2 bg-gray-800 rounded text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <button onClick={sendMessage} className="px-3 py-2 bg-blue-600 rounded text-sm cursor-pointer hover:bg-blue-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!chatOpen && (
        <button 
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 right-4 px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition cursor-pointer flex items-center gap-2"
        >
          <ChatIcon className="w-5 h-5" /> Open Chat
        </button>
      )}
    </div>
  )
}
