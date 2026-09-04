'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { VideoIcon, SkipIcon, CloseIcon, ChatBubbleIcon, DotsLoader } from '@/components/icons'

interface Message {
  id: number
  sender: 'me' | 'them'
  text: string
  time: string
}

function ChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const matchId = searchParams.get('matchId')
  const isBot = searchParams.get('bot') === '1'
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [showSkip, setShowSkip] = useState(false)
  const [thinking, setThinking] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 10000)

    setTimeout(() => {
      setMessages([{
        id: 1,
        sender: 'them',
        text: 'Hey :) what are you into?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const sendMessage = () => {
    if (!input.trim()) return

    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'me',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
    setInput('')
    setThinking(true)

    setTimeout(() => {
      setThinking(false)
      const replies = ['Nice! Tell me more', 'I like that too', 'Hmm interesting...', 'What else do you like?', 'Show me?']
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'them',
        text: replies[Math.floor(Math.random() * replies.length)],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    }, 1000 + Math.random() * 2000)
  }

  return (
    <div className="min-h-dvh bg-[#0e0a07] text-[#f5ebe0] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-amber-900/30 bg-[#130c07]/80 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-dot" />
          <span className="text-sm text-[#c7b5a3]">{isBot ? 'Test Match Bot' : matchId ? 'Connected' : 'Anonymous User'}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/watch${matchId ? `?matchId=${encodeURIComponent(matchId)}&bot=${isBot ? '1' : '0'}` : ''}`)}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg text-sm font-semibold hover:from-amber-500 hover:to-orange-500 transition-all cursor-pointer flex items-center gap-2 btn-press"
          >
            <VideoIcon className="w-4 h-4" /> Watch Together
          </button>
          {showSkip && (
            <button
              onClick={() => router.push('/queue')}
              className="px-4 py-2 bg-[#4a2117] border border-orange-900/50 rounded-lg text-sm font-semibold hover:bg-[#64291a] transition-all cursor-pointer flex items-center gap-2 btn-press animate-fade-in"
            >
              <SkipIcon className="w-4 h-4" /> Skip
            </button>
          )}
          <button
            onClick={() => router.push('/end')}
            className="px-4 py-2 bg-[#261b14] border border-amber-900/35 rounded-lg text-sm font-semibold hover:bg-[#32231a] transition-all cursor-pointer flex items-center gap-2 btn-press"
          >
            <CloseIcon className="w-4 h-4" /> End
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20 animate-fade-in">
            <ChatBubbleIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p>Waiting for messages...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl ${
              msg.sender === 'me'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                : 'bg-[#21150e] border border-amber-900/25 text-[#e5d8ca]'
            }`}>
              <p className="text-sm">{msg.text}</p>
              <p className="text-[10px] opacity-40 mt-1">{msg.time}</p>
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start animate-fade-in">
            <div className="px-4 py-3 rounded-2xl bg-[#21150e] border border-amber-900/25">
              <DotsLoader className="w-5 h-5 text-amber-400/60" />
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-amber-900/30 bg-[#130c07]/70">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-[#21150e] border border-amber-900/30 rounded-xl text-white placeholder-[#8c7867] focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600/50 text-sm transition-all"
          />
          <button
            onClick={sendMessage}
            className="px-5 py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl font-semibold hover:from-amber-500 hover:to-orange-500 transition-all cursor-pointer flex items-center gap-2 btn-press"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Chat() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0e0a07]" />}>
      <ChatContent />
    </Suspense>
  )
}
