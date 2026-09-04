'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client'

export interface ChatMessage {
  id: string
  sender: 'me' | 'them'
  text: string
  time: string
}

interface UseChatOptions {
  matchId: string
  userId: string
}

interface UseChatReturn {
  messages: ChatMessage[]
  connected: boolean
  sendMessage: (text: string) => void
  typing: boolean
}

export function useChat({ matchId, userId }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [typing, setTyping] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured() || !matchId || !userId) return

    const supabase = createClient()
    const channelName = `match:${matchId}`

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    })

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        if (payload.sender === userId) return // ignore own messages
        setMessages(prev => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sender: 'them',
            text: payload.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.sender === userId) return
        setTyping(true)
        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => setTyping(false), 2000)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true)
        }
      })

    channelRef.current = channel

    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
      supabase.removeChannel(channel)
      setConnected(false)
    }
  }, [matchId, userId])

  const sendMessage = useCallback((text: string) => {
    if (!channelRef.current || !text.trim()) return

    const channel = channelRef.current

    // Add own message to local state
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'me',
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])

    // Broadcast to other user
    channel.send({
      type: 'broadcast',
      event: 'message',
      payload: { sender: userId, text: text.trim() },
    })
  }, [userId])

  // Send typing indicator
  const sendTyping = useCallback(() => {
    if (!channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender: userId },
    })
  }, [userId])

  return { messages, connected, sendMessage, typing }
}
