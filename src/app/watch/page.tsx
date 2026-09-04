'use client'

import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CloseIcon, ChatIcon, VideoIcon, SearchIcon } from '@/components/icons'
import SearchAutocomplete, { SearchFilters } from '@/components/SearchAutocomplete'
import VideoCard from '@/components/VideoCard'
import VideoPlayer from '@/components/VideoPlayer'
import ControlPanel, { ControlState, ControlRole } from '@/components/ControlPanel'
import { filterSeen, markSeen } from '@/utils/dedup'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client'
import { useUser } from '@/utils/supabase/useUser'

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

function WatchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const matchId = searchParams.get('matchId')
  const isBot = searchParams.get('bot') === '1'
  const { user } = useUser()
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoWithStream | null>(null)
  const [secondVideo, setSecondVideo] = useState<VideoWithStream | null>(null)
  const [proposedVideo, setProposedVideo] = useState<VideoWithStream | null>(null)
  const [incomingVideoProposal, setIncomingVideoProposal] = useState<VideoWithStream | null>(null)
  const [videoProposalStatus, setVideoProposalStatus] = useState<'idle' | 'waiting' | 'accepted' | 'declined'>('idle')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([
    { sender: 'them', text: 'Pick something hot!' }
  ])
  const [input, setInput] = useState('')
  const [searched, setSearched] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [controlOwner, setControlOwner] = useState<'you' | 'them'>('you')
  const [controlRequestPending, setControlRequestPending] = useState(false)
  const [incomingControlRequest, setIncomingControlRequest] = useState(false)
  const [relationshipNote, setRelationshipNote] = useState('You are sharing control')
  const [guidedMode, setGuidedMode] = useState(false)
  const [participantChoice, setParticipantChoice] = useState('')
  const [incomingSuggestion, setIncomingSuggestion] = useState('')
  const [suggestionState, setSuggestionState] = useState<'idle' | 'sent' | 'accepted' | 'declined'>('idle')
  const [partnerOnline, setPartnerOnline] = useState(true)
  const channelRef = useRef<{ send: (payload: { type: 'broadcast'; event: string; payload: Record<string, string> }) => Promise<unknown> } | null>(null)
  const proposedVideoRef = useRef<VideoWithStream | null>(null)
  const selectedVideoRef = useRef<VideoWithStream | null>(null)
  const lastSearch = useRef<{ query: string; filters: SearchFilters; page: number } | null>(null)

  proposedVideoRef.current = proposedVideo
  selectedVideoRef.current = selectedVideo

  useEffect(() => {
    if (!matchId || isBot || !isSupabaseConfigured()) return

    const channel = createClient().channel(`watch:${matchId}`)
    channelRef.current = channel
    channel
      .on('broadcast', { event: 'control_offer' }, ({ payload }) => {
        if (payload.senderId !== user?.id) setIncomingControlRequest(true)
      })
      .on('broadcast', { event: 'control_granted' }, ({ payload }) => {
        if (payload.senderId !== user?.id) {
          setControlRequestPending(false)
          setControlOwner('them')
          setRelationshipNote('They accepted your offer')
          addPartnerMessage('I will guide this part.')
        }
      })
      .on('broadcast', { event: 'control_reclaimed' }, ({ payload }) => {
        if (payload.senderId !== user?.id) {
          setControlOwner('you')
          setRelationshipNote('You are sharing control')
          addPartnerMessage('Control is back with you.')
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.text) addPartnerMessage(payload.text)
      })
      .on('broadcast', { event: 'guided_mode' }, ({ payload }) => {
        if (payload.senderId !== user?.id) setGuidedMode(payload.enabled === 'true')
      })
      .on('broadcast', { event: 'participant_choice' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.choice) {
          setParticipantChoice(payload.choice)
          addPartnerMessage(`My choice: ${payload.choice}`)
        }
      })
      .on('broadcast', { event: 'suggestion' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.text) {
          setIncomingSuggestion(payload.text)
          setSuggestionState('idle')
        }
      })
      .on('broadcast', { event: 'suggestion_response' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.response) {
          setSuggestionState(payload.response === 'accepted' ? 'accepted' : 'declined')
          addPartnerMessage(payload.response === 'accepted' ? 'Suggestion accepted.' : 'Suggestion declined.')
        }
      })
      .on('broadcast', { event: 'video_proposal' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.video) {
          setIncomingVideoProposal(JSON.parse(payload.video) as VideoWithStream)
        }
      })
      .on('broadcast', { event: 'video_response' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.response) {
          setVideoProposalStatus(payload.response === 'accepted' ? 'accepted' : 'declined')
          if (payload.response === 'accepted' && proposedVideoRef.current) {
            const approvedVideo = proposedVideoRef.current
            setSelectedVideo(current => current || approvedVideo)
            setSecondVideo(current => current || (selectedVideoRef.current ? approvedVideo : null))
            setProposedVideo(null)
          }
          addPartnerMessage(payload.response === 'accepted' ? 'Video approved.' : 'Video suggestion declined.')
        }
      })
      .subscribe()

    return () => {
      channelRef.current = null
      void createClient().removeChannel(channel)
    }
  }, [matchId, isBot, user?.id])

  function addPartnerMessage(text: string) {
    setMessages(prev => [...prev, { sender: 'them', text }])
  }

  const requestControl = () => {
    setControlRequestPending(true)
    setRelationshipNote('Waiting for their consent')
    setMessages(prev => [...prev, { sender: 'me', text: 'Can I take the controls for a moment?' }])
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'control_offer',
        payload: { senderId: user?.id || 'guest' },
      })
    } else {
      setControlRequestPending(false)
      setControlOwner('them')
      setRelationshipNote('They are guiding the session')
      addPartnerMessage('Sure, you can guide this part.')
    }
  }

  const reclaimControl = () => {
    setControlOwner('you')
    setRelationshipNote('You are sharing control')
    addPartnerMessage('Control is back with you.')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'control_reclaimed',
        payload: { senderId: user?.id || 'guest' },
      })
    }
  }

  const sendReaction = (reaction: string) => {
    setMessages(prev => [...prev, { sender: 'me', text: reaction }])
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { senderId: user?.id || 'guest', text: reaction },
      })
    }
  }

  const proposeVideo = (video: VideoWithStream) => {
    setProposedVideo(video)
    setVideoProposalStatus('waiting')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'video_proposal',
        payload: { senderId: user?.id || 'guest', video: JSON.stringify(video) },
      })
    } else {
      setVideoProposalStatus('accepted')
      if (!selectedVideo) setSelectedVideo(video)
      else setSecondVideo(video)
      setProposedVideo(null)
    }
  }

  const respondToVideoProposal = (response: 'accepted' | 'declined') => {
    if (!incomingVideoProposal) return
    if (response === 'accepted') {
      if (!selectedVideo) setSelectedVideo(incomingVideoProposal)
      else if (!secondVideo) setSecondVideo(incomingVideoProposal)
      addPartnerMessage('Video approved.')
    } else {
      addPartnerMessage('Video suggestion declined.')
    }
    setIncomingVideoProposal(null)
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'video_response',
        payload: { senderId: user?.id || 'guest', response },
      })
    }
  }

  const toggleGuidedMode = () => {
    const enabled = !guidedMode
    setGuidedMode(enabled)
    setRelationshipNote(enabled ? 'Guided session is active' : 'You are sharing control')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'guided_mode',
        payload: { senderId: user?.id || 'guest', enabled: String(enabled) },
      })
    }
  }

  const chooseParticipantAction = (choice: string) => {
    setParticipantChoice(choice)
    addPartnerMessage(`My choice: ${choice}`)
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'participant_choice',
        payload: { senderId: user?.id || 'guest', choice },
      })
    }
  }

  const sendSuggestion = (suggestion: string) => {
    setSuggestionState('sent')
    addPartnerMessage(`Suggestion sent: ${suggestion}`)
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'suggestion',
        payload: { senderId: user?.id || 'guest', text: suggestion },
      })
    }
  }

  const respondToSuggestion = (response: 'accepted' | 'declined') => {
    setSuggestionState(response)
    setIncomingSuggestion('')
    addPartnerMessage(response === 'accepted' ? 'Suggestion accepted.' : 'Suggestion declined.')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'suggestion_response',
        payload: { senderId: user?.id || 'guest', response },
      })
    }
  }

  const acceptControl = () => {
    setIncomingControlRequest(false)
    setControlOwner('you')
    setRelationshipNote('You accepted their offer')
    addPartnerMessage('You are guiding this part.')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'control_granted',
        payload: { senderId: user?.id || 'guest' },
      })
    }
  }

  const declineControl = () => {
    setIncomingControlRequest(false)
    addPartnerMessage('They kept control for now.')
  }

  const searchVideos = useCallback(async (query: string, filters: SearchFilters, page = 1, append = false) => {
    if (!query.trim()) return

    if (append) setLoadingMore(true)
    else lastSearch.current = { query, filters, page: 1 }

    // Create cache key including filters
    const cacheKey = `${query}_${filters.sortBy}_${filters.site}`

    if (!append && videoCache.has(cacheKey)) {
      const cached = videoCache.get(cacheKey)!
      const unseen = await filterSeen(cached)
      setVideos(unseen)
      setSearched(true)
      lastSearch.current = { query, filters, page: 1 }
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
        const results: Video[] = data.slice(0, 40).map((v: Record<string, unknown>) => ({
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
        lastSearch.current = { query, filters, page }
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
    searchVideos(query, filters)
  }, [searchVideos])

  const loadMore = useCallback(() => {
    const currentSearch = lastSearch.current
    if (currentSearch && !loadingMore) {
      searchVideos(currentSearch.query, currentSearch.filters, currentSearch.page + 1, true)
    }
  }, [loadingMore, searchVideos])

  async function handleVideoClick(video: Video) {
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

        proposeVideo({
          ...video,
          streamUrl: data.streamUrl,
          thumbnail: data.thumbnail || video.thumbnail,
          formats: data.formats,
        })
        setMessages(prev => [...prev, { sender: 'me', text: 'I suggest this video for us.' }])
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
  }

  const handleBack = useCallback(() => {
    setSelectedVideo(null)
  }, [])

  const sendMessage = () => {
    if (!input.trim()) return
    const message = input.trim()
    setMessages(prev => [...prev, { sender: 'me', text: message }])
    setInput('')

    if (isBot) {
      window.setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'them', text: 'I am watching with you. Nice pick!' }])
      }, 900)
    }
  }

  // If video is selected, show player
  if (selectedVideo && selectedVideo.streamUrl) {
    return (
      <div className="h-screen bg-black text-white flex">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className={`flex-1 min-h-0 ${secondVideo ? 'grid grid-rows-2 gap-px bg-gray-800' : ''}`}>
            <VideoPlayer
              streamUrl={selectedVideo.streamUrl}
              thumbnail={selectedVideo.thumbnail || ''}
              title={selectedVideo.title}
              duration={selectedVideo.duration || undefined}
              onBack={handleBack}
              formats={selectedVideo.formats}
              mode="together"
              canControl={controlOwner === 'you'}
            />
            {secondVideo && secondVideo.streamUrl && (
              <VideoPlayer
                streamUrl={secondVideo.streamUrl}
                thumbnail={secondVideo.thumbnail || ''}
                title={secondVideo.title}
                duration={secondVideo.duration || undefined}
                onBack={handleBack}
                formats={secondVideo.formats}
                mode="together"
                canControl={controlOwner === 'you'}
              />
            )}
          </div>
        </div>

        {/* Side Panel: Control + Chat */}
        {chatOpen && (
          <div className="w-80 border-l border-gray-800 flex flex-col shrink-0">
            {/* Immersive Control Panel */}
            <div className="flex-1 overflow-y-auto">
              <ControlPanel
                controlState={
                  incomingControlRequest ? 'pending' :
                  controlRequestPending ? 'offering' :
                  controlOwner === 'them' ? 'granted' : 'idle'
                }
                role={controlOwner === 'you' ? 'controller' : 'participant'}
                guidedMode={guidedMode}
                incomingSuggestion={incomingSuggestion}
                partnerOnline={partnerOnline}
                onOfferControl={requestControl}
                onReclaimControl={reclaimControl}
                onAcceptControl={acceptControl}
                onDeclineControl={declineControl}
                onSendSuggestion={sendSuggestion}
                onRespondToSuggestion={respondToSuggestion}
                onToggleGuidedMode={toggleGuidedMode}
                onChooseAction={chooseParticipantAction}
                onSendReaction={sendReaction}
              />

              {/* Video Proposal UI */}
              {proposedVideo && (
                <div className="mx-4 mb-3 rounded-lg border border-blue-500/40 bg-blue-950/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-blue-300 mb-1">Your video proposal</p>
                  <p className="text-xs text-white truncate">{proposedVideo.title}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {videoProposalStatus === 'waiting' ? 'Waiting for partner approval...' : videoProposalStatus === 'declined' ? 'Partner declined this video.' : 'Partner approved this video.'}
                  </p>
                </div>
              )}
              {incomingVideoProposal && (
                <div className="mx-4 mb-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-300 mb-1">Partner suggests</p>
                  <p className="text-xs text-white truncate">{incomingVideoProposal.title}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => respondToVideoProposal('accepted')} className="flex-1 px-2 py-1.5 rounded-md bg-emerald-600 text-xs hover:bg-emerald-500 transition cursor-pointer">Add video</button>
                    <button onClick={() => respondToVideoProposal('declined')} className="flex-1 px-2 py-1.5 rounded-md border border-gray-700 text-xs text-gray-300 hover:text-white transition cursor-pointer">Decline</button>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Header */}
            <div className="p-3 border-b border-gray-800 flex justify-between items-center">
              <span className="font-semibold text-sm flex items-center gap-2">
                <ChatIcon className="w-4 h-4" /> {isBot ? 'Test Bot Chat' : 'Live Chat'}
              </span>
              <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            
            {/* Chat Messages */}
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
            
            {/* Chat Input */}
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
              onClick={() => router.push(`/chat${matchId ? `?matchId=${encodeURIComponent(matchId)}&bot=${isBot ? '1' : '0'}` : ''}`)}
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
                  key={`${video.hash || video.videoId}_${video.thumbnail || ''}`}
                  videoId={video.videoId}
                  title={video.title}
                  thumbnail={video.thumbnail}
                  preview={video.preview}
                  duration={video.duration}
                  views={video.views}
                  site={video.site}
                  onClick={() => handleVideoClick(video)}
                />
              ))}
            </div>
          )}

          {searched && videos.length > 0 && hasMore && (
            <div className="flex justify-center py-10">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 bg-gray-800 rounded-lg text-sm font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50 transition cursor-pointer"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
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

export default function Watch() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0e0a07]" />}>
      <WatchContent />
    </Suspense>
  )
}
