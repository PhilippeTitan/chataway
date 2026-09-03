'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Watch() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [videos, setVideos] = useState<Record<string, unknown>[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Record<string, unknown> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([
    { sender: 'them', text: 'Pick something hot! 🔥' }
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
    setMessages(prev => [...prev, { sender: 'them', text: `Nice choice! 😏` }])
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    setMessages(prev => [...prev, { 
      sender: 'me', 
      text: isPlaying ? '⏸ Paused' : '▶️ Playing' 
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
          <h2 className="text-xl font-bold">🎬 Watch Together</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/chat')}
              className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 transition cursor-pointer"
            >
              💬 Chat Only
            </button>
            <button 
              onClick={() => router.push('/end')}
              className="px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition cursor-pointer"
            >
              ✕ End Session
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
                className="px-8 py-4 bg-purple-600 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video, i) => (
                <div 
                  key={i} 
                  onClick={() => selectVideo(video)}
                  className="bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition cursor-pointer"
                >
                  <div className="aspect-video bg-gray-800 flex items-center justify-center">
                    {video.thumbnail ? (
                      <img src={video.thumbnail as string} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">🎬</span>
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
          <div className="flex-1 flex items-center justify-center bg-black">
            <div className="w-full max-w-4xl aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center relative">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-xl mb-2">{String(selectedVideo.title)}</p>
              <p className="text-gray-400 text-sm mb-6">Synced playback with your match</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={togglePlay}
                  className="px-8 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition cursor-pointer"
                >
                  {isPlaying ? '⏸ Pause' : '▶️ Play'}
                </button>
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="px-8 py-3 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition cursor-pointer"
                >
                  ← Back to Search
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side Chat */}
      {chatOpen && (
        <div className="w-80 border-l border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center">
            <span className="font-semibold text-sm">Live Chat</span>
            <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">✕</button>
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
              <button onClick={sendMessage} className="px-3 py-2 bg-blue-600 rounded text-sm cursor-pointer">Send</button>
            </div>
          </div>
        </div>
      )}

      {!chatOpen && (
        <button 
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 right-4 px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition cursor-pointer"
        >
          💬 Open Chat
        </button>
      )}
    </div>
  )
}