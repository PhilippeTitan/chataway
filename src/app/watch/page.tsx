'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, PlayIcon, PauseIcon, CloseIcon, ChatIcon, BackIcon } from '@/components/icons'

export default function Watch() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [videos, setVideos] = useState<Record<string, unknown>[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Record<string, unknown> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([
    { sender: 'them', text: 'Pick something hot!' }
  ])
  const [input, setInput] = useState('')

  const searchVideos = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setVideos(Array.isArray(data) ? data.slice(0, 12) : [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const selectVideo = (video: Record<string, unknown>) => {
    setSelectedVideo(video)
    setIsPlaying(true)
    setMessages(prev => [...prev, { sender: 'them', text: 'Nice choice!' }])
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    setMessages(prev => [...prev, { 
      sender: 'me', 
      text: isPlaying ? 'Paused' : 'Playing' 
    }])
  }

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { sender: 'me', text: input }])
    setInput('')
  }

  return (
    <div className="h-screen bg-black text-white flex">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <VideoIcon className="w-6 h-6" /> Watch Together
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

        {!selectedVideo ? (
          /* Video Browser */
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchVideos()}
                placeholder="Search videos to watch together..."
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

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video, i) => (
                <div 
                  key={i} 
                  onClick={() => selectVideo(video)}
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
        ) : (
          /* Video Player */
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            <div className="w-full max-w-5xl">
              <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative">
                <iframe
                  src={`https://www.pornhub.com/embed/${String(selectedVideo.videoId)}`}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  frameBorder={0}
                />
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{String(selectedVideo.title)}</h3>
                  <div className="flex gap-4 text-sm text-gray-400">
                    {selectedVideo.duration && <span>{String(selectedVideo.duration)}</span>}
                    {selectedVideo.views && <span>{String(selectedVideo.views)}</span>}
                    {selectedVideo.rating && <span>{String(selectedVideo.rating)}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={togglePlay}
                    className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition cursor-pointer flex items-center gap-2"
                  >
                    {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
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

      {/* Side Chat */}
      {chatOpen && (
        <div className="w-80 border-l border-gray-800 flex flex-col">
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
              <button onClick={sendMessage} className="px-3 py-2 bg-blue-600 rounded text-sm cursor-pointer">
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

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}