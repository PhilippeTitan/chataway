'use client'

import { useState } from 'react'

interface Video {
  title: string
  url: string
  thumbnail?: string
  duration?: string
  views?: string
}

export default function Home() {
  const [gender, setGender] = useState<'man' | 'woman' | null>(null)
  const [step, setStep] = useState<'landing' | 'search' | 'matching'>('landing')
  const [searchQuery, setSearchQuery] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(false)

  const searchVideos = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=video&category=r`)
      const data = await res.json()
      setVideos(Array.isArray(data) ? data.slice(0, 12) : [])
    } catch (err) {
      console.error('Search failed:', err)
    }
    setLoading(false)
  }

  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-5xl font-bold mb-4">CHATAway</h1>
        <p className="text-gray-400 mb-10 text-lg">Anonymous connections. No BS.</p>
        
        <div className="flex gap-4">
          <button 
            onClick={() => { setGender('man'); setStep('search') }}
            className="px-10 py-5 bg-blue-600 rounded-lg text-xl font-semibold hover:bg-blue-700 transition cursor-pointer"
          >
            I&apos;m a Man
          </button>
          <button 
            onClick={() => { setGender('woman'); setStep('search') }}
            className="px-10 py-5 bg-pink-600 rounded-lg text-xl font-semibold hover:bg-pink-700 transition cursor-pointer"
          >
            I&apos;m a Woman
          </button>
        </div>
      </div>
    )
  }

  if (step === 'search') {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">
              {gender === 'man' ? '👨' : '👩'} Search & Browse
            </h2>
            <button 
              onClick={() => setStep('matching')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-pink-600 rounded-lg font-semibold hover:opacity-90 transition cursor-pointer"
            >
              Start Matching
            </button>
          </div>

          <div className="flex gap-4 mb-8">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchVideos()}
              placeholder="Search videos... (e.g. amateur, teen, milf)"
              className="flex-1 px-6 py-4 bg-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={searchVideos}
              disabled={loading}
              className="px-8 py-4 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {loading && (
            <div className="text-center py-20">
              <div className="animate-pulse text-4xl mb-4">🔍</div>
              <p className="text-gray-400">Searching...</p>
            </div>
          )}

          {!loading && videos.length === 0 && searchQuery && (
            <div className="text-center py-20">
              <p className="text-gray-400">No results found. Try a different search.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, i) => (
              <div key={i} className="bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition cursor-pointer">
                <div className="aspect-video bg-gray-800 flex items-center justify-center">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🎬</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-sm line-clamp-2 mb-2">{video.title || 'Untitled'}</h3>
                  <div className="flex gap-4 text-xs text-gray-500">
                    {video.duration && <span>{video.duration}</span>}
                    {video.views && <span>{video.views}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold mb-4">Finding your match...</h2>
      <p className="text-gray-400 mb-8">
        {gender === 'man' ? 'Looking for a woman...' : 'Looking for a man...'}
      </p>
      <div className="animate-pulse text-6xl">🔍</div>
    </div>
  )
}