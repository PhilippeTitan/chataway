'use client'

import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CloseIcon, ChatIcon, VideoIcon, SearchIcon, BoltIcon, SendIcon } from '@/components/icons'
import SearchAutocomplete, { SearchFilters } from '@/components/SearchAutocomplete'
import VideoCard from '@/components/VideoCard'
import VideoPlayer from '@/components/VideoPlayer'
import ControlMode from '@/components/ControlMode'
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

const getVideoKey = (video: Video) => video.hash || `${video.site || 'video'}:${video.videoId}`

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
  const [validationVideo, setValidationVideo] = useState<Video | null>(null)
  const [validationSelfApproved, setValidationSelfApproved] = useState(false)
  const [validationPartnerApproved, setValidationPartnerApproved] = useState(false)
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
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid')
  const [controlOwner, setControlOwner] = useState<'you' | 'them'>('you')
  const [partnerOnline, setPartnerOnline] = useState(true)
  const [controlModeActive, setControlModeActive] = useState(false)
  const [fullAuto, setFullAuto] = useState(false)
  const channelRef = useRef<{ send: (payload: { type: 'broadcast'; event: string; payload: Record<string, string> }) => Promise<unknown> } | null>(null)
  const proposedVideoRef = useRef<VideoWithStream | null>(null)
  const selectedVideoRef = useRef<VideoWithStream | null>(null)
  const validationSelfApprovedRef = useRef(false)
  const validationPartnerApprovedRef = useRef(false)
  const validationVideoRef = useRef<Video | null>(null)
  const loadingApprovedVideoRef = useRef<string | null>(null)
  const lastSearch = useRef<{ query: string; filters: SearchFilters; page: number } | null>(null)

  proposedVideoRef.current = proposedVideo
  selectedVideoRef.current = selectedVideo
  validationSelfApprovedRef.current = validationSelfApproved
  validationPartnerApprovedRef.current = validationPartnerApproved
  validationVideoRef.current = validationVideo

  useEffect(() => {
    if (!matchId || isBot || !isSupabaseConfigured()) return

    const channel = createClient().channel(`watch:${matchId}`)
    channelRef.current = channel
    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.text) addPartnerMessage(payload.text)
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
      .on('broadcast', { event: 'video_validation_request' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.video) {
          setValidationVideo(JSON.parse(payload.video) as Video)
          setValidationSelfApproved(false)
          setValidationPartnerApproved(false)
          addPartnerMessage('Your partner is asking to watch a video together.')
        }
      })
      .on('broadcast', { event: 'video_validation_response' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.videoKey === (validationVideoRef.current && getVideoKey(validationVideoRef.current))) {
          if (payload.approved === 'true') {
            setValidationPartnerApproved(true)
            if (validationSelfApprovedRef.current && validationVideoRef.current) void loadApprovedVideo(validationVideoRef.current)
          } else {
            setValidationVideo(null)
            setValidationSelfApproved(false)
            setValidationPartnerApproved(false)
            addPartnerMessage('Your partner declined that video.')
          }
        }
      })
      // Control mode events
      .on('broadcast', { event: 'quest_send' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.text) {
          addPartnerMessage(`Quest: ${payload.text}`)
        }
      })
      .on('broadcast', { event: 'quest_response' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.accepted) {
          addPartnerMessage('They accepted your quest!')
        } else if (payload.senderId !== user?.id) {
          addPartnerMessage('They passed on that quest.')
        }
      })
      .on('broadcast', { event: 'request_send' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.text) {
          addPartnerMessage(`Request: ${payload.text}`)
        }
      })
      .on('broadcast', { event: 'request_response' }, ({ payload }) => {
        if (payload.senderId !== user?.id && payload.accepted) {
          addPartnerMessage('Your request was granted!')
        } else if (payload.senderId !== user?.id) {
          addPartnerMessage('Your request was declined.')
        }
      })
      .on('broadcast', { event: 'full_auto_toggle' }, ({ payload }) => {
        if (payload.senderId !== user?.id) {
          setFullAuto(payload.enabled === 'true')
          addPartnerMessage(payload.enabled === 'true' ? 'Full auto enabled.' : 'Full auto disabled.')
        }
      })
      .on('broadcast', { event: 'i_came' }, ({ payload }) => {
        if (payload.senderId !== user?.id) {
          addPartnerMessage('They finished!')
        }
      })
      .on('broadcast', { event: 'role_switch_request' }, ({ payload }) => {
        if (payload.senderId !== user?.id) {
          addPartnerMessage('They want to switch roles.')
        }
      })
      .on('broadcast', { event: 'role_switch_response' }, ({ payload }) => {
        if (payload.senderId !== user?.id) {
          addPartnerMessage(payload.accepted === 'true' ? 'Role switch accepted.' : 'Role switch declined.')
        }
      })
      .on('broadcast', { event: 'safety_exit' }, ({ payload }) => {
        if (payload.senderId !== user?.id) {
          addPartnerMessage(payload.reason ? `Safety: ${payload.reason}` : 'They need to stop.')
        }
      })
      .on('broadcast', { event: 'control_mode_toggle' }, ({ payload }) => {
        if (payload.senderId !== user?.id) {
          setControlModeActive(payload.active === 'true')
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

  function botReply(text: string, delay = 500) {
    if (isBot) window.setTimeout(() => addPartnerMessage(text), delay)
  }

  const respondToVideoProposal = (response: 'accepted' | 'declined') => {
    if (!incomingVideoProposal) return
    if (response === 'accepted') {
      if (!selectedVideo) setSelectedVideo(incomingVideoProposal)
      else if (!secondVideo) setSecondVideo(incomingVideoProposal)
    }
    setIncomingVideoProposal(null)
    if (channelRef.current) void channelRef.current.send({ type: 'broadcast', event: 'video_response', payload: { senderId: user?.id || 'guest', response } })
    botReply(response === 'accepted' ? 'Thanks, I am ready to watch it.' : 'That is okay. We can try another video.')
  }

  const approveValidationVideo = () => {
    if (!validationVideo) return
    setValidationSelfApproved(true)
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'video_validation_response',
        payload: { senderId: user?.id || 'guest', videoKey: getVideoKey(validationVideo), approved: 'true' },
      })
    }
    if (isBot) {
      setValidationPartnerApproved(true)
      botReply('I approve this video. I am waiting for your approval too.')
      void loadApprovedVideo(validationVideo)
    } else if (validationPartnerApprovedRef.current) {
      void loadApprovedVideo(validationVideo)
    }
  }

  const declineValidationVideo = () => {
    if (!validationVideo) return
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'video_validation_response',
        payload: { senderId: user?.id || 'guest', videoKey: getVideoKey(validationVideo), approved: 'false' },
      })
    }
    setValidationVideo(null)
    setValidationSelfApproved(false)
    setValidationPartnerApproved(false)
    botReply('No worries. Let’s choose something else.')
  }

  async function loadApprovedVideo(video: Video) {
    const videoKey = getVideoKey(video)
    if (loadingApprovedVideoRef.current === videoKey) return
    loadingApprovedVideoRef.current = videoKey
    const isFirstSlot = !selectedVideoRef.current
    const pendingVideo = { ...video }
    if (isFirstSlot) setSelectedVideo(pendingVideo)
    else setSecondVideo(pendingVideo)
    setValidationVideo(null)
    setValidationSelfApproved(false)
    setValidationPartnerApproved(false)
    setExtracting(true)
    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(video.siteUrl || '')}&hash=${video.hash || ''}`)
      const data = await res.json()
      if (!data.streamUrl) throw new Error('No stream URL returned')

      const approvedVideo = {
        ...video,
        streamUrl: data.streamUrl,
        thumbnail: data.thumbnail || video.thumbnail,
        formats: data.formats,
      }
      if (video.hash && video.site && video.videoId) await markSeen(video)
      if (isFirstSlot) setSelectedVideo(approvedVideo)
      else setSecondVideo(approvedVideo)
      setMessages(prev => [...prev, { sender: 'them', text: 'Both of us approved. Loading it now.' }])
    } catch (error) {
      console.error('Approved video failed to load:', error)
      if (isFirstSlot) setSelectedVideo(null)
      else setSecondVideo(null)
      setMessages(prev => [...prev, { sender: 'them', text: 'That video could not be loaded. Let’s choose another.' }])
    } finally {
      loadingApprovedVideoRef.current = null
      setExtracting(false)
    }
  }

  // Control mode functions
  const activateControlMode = () => {
    setControlModeActive(true)
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'control_mode_toggle',
        payload: { senderId: user?.id || 'guest', active: 'true' },
      })
    }
  }

  const deactivateControlMode = () => {
    setControlModeActive(false)
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'control_mode_toggle',
        payload: { senderId: user?.id || 'guest', active: 'false' },
      })
    }
  }

  const sendQuest = (text: string, category: string) => {
    addPartnerMessage(`Quest: ${text}`)
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'quest_send',
        payload: { senderId: user?.id || 'guest', text, category },
      })
    }
  }

  const respondToQuest = (id: string, accepted: boolean) => {
    addPartnerMessage(accepted ? 'Accepted quest.' : 'Passed on quest.')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'quest_response',
        payload: { senderId: user?.id || 'guest', accepted: String(accepted) },
      })
    }
  }

  const sendRequest = (text: string) => {
    addPartnerMessage(`Request: ${text}`)
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'request_send',
        payload: { senderId: user?.id || 'guest', text },
      })
    }
  }

  const respondToRequest = (id: string, accepted: boolean) => {
    addPartnerMessage(accepted ? 'Request granted.' : 'Request declined.')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'request_response',
        payload: { senderId: user?.id || 'guest', accepted: String(accepted) },
      })
    }
  }

  const toggleFullAuto = (enabled: boolean) => {
    setFullAuto(enabled)
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'full_auto_toggle',
        payload: { senderId: user?.id || 'guest', enabled: String(enabled) },
      })
    }
  }

  const handleICame = () => {
    addPartnerMessage('They finished!')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'i_came',
        payload: { senderId: user?.id || 'guest' },
      })
    }
  }

  const handleSafetyExit = (reason: string) => {
    addPartnerMessage(reason ? `Safety: ${reason}` : 'They need to stop.')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'safety_exit',
        payload: { senderId: user?.id || 'guest', reason },
      })
    }
  }

  const handleRoleSwitchAccept = () => {
    setControlOwner(controlOwner === 'you' ? 'them' : 'you')
    addPartnerMessage('Roles switched!')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'role_switch_response',
        payload: { senderId: user?.id || 'guest', accepted: 'true' },
      })
    }
  }

  const handleRoleSwitchDecline = () => {
    addPartnerMessage('Keeping current roles.')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'role_switch_response',
        payload: { senderId: user?.id || 'guest', accepted: 'false' },
      })
    }
  }

  const handleAftercare = () => {
    addPartnerMessage('Entering aftercare mode.')
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { senderId: user?.id || 'guest', text: 'Entering aftercare mode.' },
      })
    }
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

    if (selectedVideo && secondVideo) {
      setMessages(prev => [...prev, { sender: 'them', text: 'Both watch slots are full. End one video before choosing another.' }])
      return
    }

    setValidationVideo(video)
    setValidationSelfApproved(false)
    setValidationPartnerApproved(false)
    setMessages(prev => [...prev, { sender: 'me', text: 'I would like to watch this together.' }])
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'video_validation_request',
        payload: { senderId: user?.id || 'guest', video: JSON.stringify(video) },
      })
    } else if (isBot) {
      setValidationPartnerApproved(true)
      botReply('I approve this video. Please confirm it on your side.')
    }
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

  const videoValidator = validationVideo && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 safe-top safe-bottom backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-gray-950 p-5 shadow-2xl shadow-purple-950/30">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-purple-300">Shared watch validator</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Agree on this video</h2>
            <p className="mt-1 text-xs text-gray-400">It will not load until you both approve.</p>
          </div>
          <button onClick={declineValidationVideo} className="text-gray-500 hover:text-white cursor-pointer" aria-label="Close validator">×</button>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3 mb-5">
          <p className="text-sm font-medium text-white line-clamp-2">{validationVideo.title}</p>
          <p className="text-xs text-gray-500 mt-1">{validationVideo.site || 'Shared selection'}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className={`rounded-lg border p-3 ${validationSelfApproved ? 'border-emerald-500/50 bg-emerald-950/30' : 'border-gray-800 bg-gray-900/40'}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">You</p>
            <p className="text-xs text-white mt-1">{validationSelfApproved ? 'Approved' : 'Waiting'}</p>
          </div>
          <div className={`rounded-lg border p-3 ${validationPartnerApproved ? 'border-emerald-500/50 bg-emerald-950/30' : 'border-gray-800 bg-gray-900/40'}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Partner</p>
            <p className="text-xs text-white mt-1">{validationPartnerApproved ? 'Approved' : 'Waiting'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={approveValidationVideo} disabled={validationSelfApproved} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition cursor-pointer">
            {validationSelfApproved ? 'You approved' : 'Approve video'}
          </button>
          <button onClick={declineValidationVideo} className="rounded-lg border border-gray-700 px-4 py-2.5 text-xs text-gray-300 hover:border-red-400 hover:text-white transition cursor-pointer">Decline</button>
        </div>
      </div>
    </div>
  )

  // If video is selected, show player
  if (selectedVideo) {
    return (
      <div className="min-h-dvh bg-black text-white grid grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_20rem] md:grid-rows-1 overflow-hidden">
        {videoValidator}
        {/* Main Video Area */}
        <div className="min-h-[48dvh] md:min-h-0 min-w-0 flex flex-col">
          <div className={`flex-1 min-h-0 ${secondVideo ? 'grid grid-rows-2 gap-px bg-gray-800' : ''}`}>
            {selectedVideo.streamUrl ? (
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
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-gray-950 text-gray-400">
                <div className="relative mb-5 h-16 w-24">
                  <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-purple-400/50" />
                  <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-purple-400 shadow-[0_0_28px_rgba(192,132,252,0.8)]" />
                  <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-end gap-1">
                    <span className="h-2 w-1 animate-pulse rounded-full bg-blue-400" />
                    <span className="h-4 w-1 animate-pulse rounded-full bg-purple-400 [animation-delay:120ms]" />
                    <span className="h-3 w-1 animate-pulse rounded-full bg-pink-400 [animation-delay:240ms]" />
                    <span className="h-5 w-1 animate-pulse rounded-full bg-purple-400 [animation-delay:360ms]" />
                    <span className="h-2 w-1 animate-pulse rounded-full bg-blue-400 [animation-delay:480ms]" />
                  </div>
                </div>
                <p className="text-sm">Preparing your shared watch</p>
                <p className="mt-1 text-xs text-gray-600">The conversation stays open while it loads</p>
              </div>
            )}
            {secondVideo && (
              secondVideo.streamUrl ? (
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
              ) : (
                <div className="flex h-full flex-col items-center justify-center bg-gray-950 text-gray-400">
                  <div className="relative mb-4 h-12 w-20">
                    <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-pink-400/50" />
                    <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-pink-400 shadow-[0_0_22px_rgba(244,114,182,0.8)]" />
                  </div>
                  <p className="text-sm">Preparing the second view</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Side Panel */}
        {chatOpen && (
          <div className="w-full md:w-auto md:h-full max-h-[50dvh] md:max-h-none min-h-0 border-t md:border-t-0 md:border-l border-gray-800 flex flex-col">
            {controlModeActive ? (
              /* Control Mode */
              <ControlMode
                controlOwner={controlOwner}
                partnerOnline={partnerOnline}
                onSendQuest={sendQuest}
                onResponseToQuest={respondToQuest}
                onSendRequest={sendRequest}
                onResponseToRequest={respondToRequest}
                onToggleFullAuto={toggleFullAuto}
                onICame={handleICame}
                onSafetyExit={handleSafetyExit}
                onRoleSwitchAccept={handleRoleSwitchAccept}
                onRoleSwitchDecline={handleRoleSwitchDecline}
                onAftercare={handleAftercare}
                onDeactivate={deactivateControlMode}
              />
            ) : (
              /* Default: Chat + video proposals + activate button */
              <>
                {/* Video proposals */}
                {(proposedVideo || incomingVideoProposal) && (
                  <div className="p-3 border-b border-gray-800 space-y-3">
                    {proposedVideo && (
                      <div className="rounded-lg border border-blue-500/40 bg-blue-950/30 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-blue-300 mb-1">Your video proposal</p>
                        <p className="text-xs text-white truncate">{proposedVideo.title}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {videoProposalStatus === 'waiting' ? 'Waiting for partner approval...' : videoProposalStatus === 'declined' ? 'Partner declined.' : 'Partner approved.'}
                        </p>
                      </div>
                    )}
                    {incomingVideoProposal && (
                      <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-300 mb-1">Partner suggests</p>
                        <p className="text-xs text-white truncate">{incomingVideoProposal.title}</p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => respondToVideoProposal('accepted')} className="flex-1 px-2 py-1.5 rounded-md bg-emerald-600 text-xs hover:bg-emerald-500 transition cursor-pointer">Add video</button>
                          <button onClick={() => respondToVideoProposal('declined')} className="flex-1 px-2 py-1.5 rounded-md border border-gray-700 text-xs text-gray-300 hover:text-white transition cursor-pointer">Decline</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
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
                    {selectedVideo && (
                      <button
                        onClick={activateControlMode}
                        className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-950/30 hover:from-purple-500 hover:to-pink-500 hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
                        title="Enter Control Mode"
                        aria-label="Enter Control Mode"
                      >
                        <BoltIcon className="w-5 h-5" />
                      </button>
                    )}
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Chat..."
                      className="flex-1 px-3 py-2 bg-gray-800 rounded text-sm text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button onClick={sendMessage} className="px-3 py-2 bg-blue-600 rounded text-sm cursor-pointer hover:bg-blue-700">
                      <SendIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {!chatOpen && (
          <button 
            onClick={() => setChatOpen(true)}
            className="safe-bottom fixed bottom-4 right-4 px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition cursor-pointer flex items-center gap-2"
          >
            <ChatIcon className="w-5 h-5" /> Open Chat
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-black text-white grid grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_20rem] md:grid-rows-1 overflow-hidden">
      {videoValidator}
      {/* Main Video Area */}
      <div className="min-h-0 min-w-0 flex flex-col">
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Extracting overlay */}
          {extracting && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-6 safe-top safe-bottom">
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

          <div className="flex justify-end mb-6">
            <div className="inline-flex rounded-lg border border-gray-800 bg-gray-950/80 p-1" aria-label="Browse mode">
              <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md text-xs transition cursor-pointer ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Grid</button>
              <button onClick={() => setViewMode('feed')} className={`px-3 py-1.5 rounded-md text-xs transition cursor-pointer ${viewMode === 'feed' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Feed</button>
            </div>
          </div>

          {(proposedVideo || incomingVideoProposal) && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {proposedVideo && (
                <div className="rounded-xl border border-blue-500/40 bg-blue-950/30 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-blue-300 mb-1">Video proposal sent</p>
                  <p className="text-sm text-white truncate">{proposedVideo.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {videoProposalStatus === 'waiting' ? 'Waiting for your partner to approve it...' : videoProposalStatus === 'declined' ? 'Your partner declined this video.' : 'Your partner approved this video.'}
                  </p>
                </div>
              )}
              {incomingVideoProposal && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-300 mb-1">Partner suggests</p>
                  <p className="text-sm text-white truncate">{incomingVideoProposal.title}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => respondToVideoProposal('accepted')} className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-xs font-semibold hover:bg-emerald-500 transition cursor-pointer">Add video</button>
                    <button onClick={() => respondToVideoProposal('declined')} className="flex-1 px-3 py-2 rounded-lg border border-gray-700 text-xs text-gray-300 hover:text-white transition cursor-pointer">Decline</button>
                  </div>
                </div>
              )}
            </div>
          )}

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
            <div className={viewMode === 'feed' ? 'max-w-md mx-auto space-y-8' : 'grid grid-cols-2 lg:grid-cols-3 gap-4'}>
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
                  variant={viewMode}
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
        <div className="w-full md:w-auto md:h-full max-h-[45dvh] md:max-h-none min-h-0 border-t md:border-t-0 md:border-l border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center">
            <span className="font-semibold text-sm flex items-center gap-2">
              <ChatIcon className="w-4 h-4" /> Live Chat
            </span>
            <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.sender === 'me' ? 'text-right' : ''}`}>
                <span className={msg.sender === 'me' ? 'text-blue-400' : 'text-pink-400'}>
                  {msg.sender === 'me' ? 'You' : 'Them'}:
                </span>{' '}
                <span className="text-gray-300">{msg.text}</span>
              </div>
            ))}
          </div>
          
          <div className="safe-bottom p-3 border-t border-gray-800">
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
          className="safe-bottom fixed bottom-4 right-4 px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition cursor-pointer flex items-center gap-2"
        >
          <ChatIcon className="w-5 h-5" /> Open Chat
        </button>
      )}
    </div>
  )
}

export default function Watch() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0e0a07]" />}>
      <WatchContent />
    </Suspense>
  )
}
