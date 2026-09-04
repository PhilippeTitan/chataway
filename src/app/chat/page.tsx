'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { VideoIcon, SkipIcon, CloseIcon, SendIcon } from '@/components/icons'

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
  }, [messages])

  const sendMessage = () => {
    if (!input.trim()) return
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'me',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
    setInput('')

    setTimeout(() => {
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
    <div className="h-screen bg-[#0e0a07] text-[#f5ebe0] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-amber-900/30 bg-[#130c07]/80 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-[#c7b5a3]">{isBot ? 'Test Match Bot' : matchId ? 'Matched Guest' : 'Anonymous User'}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push(`/watch${matchId ? `?matchId=${encodeURIComponent(matchId)}&bot=${isBot ? '1' : '0'}` : ''}`)}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg text-sm font-semibold hover:from-amber-500 hover:to-orange-500 transition cursor-pointer flex items-center gap-2"
          >
            <VideoIcon className="w-4 h-4" /> Watch Together
          </button>
          {showSkip && (
            <button 
              onClick={() => router.push('/queue')}
                className="px-4 py-2 bg-[#4a2117] border border-orange-900/50 rounded-lg text-sm font-semibold hover:bg-[#64291a] transition cursor-pointer flex items-center gap-2"
            >
              <SkipIcon className="w-4 h-4" /> Skip
            </button>
          )}
          <button 
            onClick={() => router.push('/end')}
            className="px-4 py-2 bg-[#261b14] border border-amber-900/35 rounded-lg text-sm font-semibold hover:bg-[#32231a] transition cursor-pointer flex items-center gap-2"
          >
            <CloseIcon className="w-4 h-4" /> End
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p>Waiting for messages...</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
              msg.sender === 'me' 
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white' 
                  : 'bg-[#21150e] border border-amber-900/25 text-[#e5d8ca]'
            }`}>
              <p>{msg.text}</p>
              <p className="text-xs opacity-50 mt-1">{msg.time}</p>
            </div>
          </div>
        ))}
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
            className="flex-1 px-4 py-3 bg-[#21150e] border border-amber-900/30 rounded-lg text-white placeholder-[#8c7867] focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
          <button
            onClick={sendMessage}
            className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg font-semibold hover:from-amber-500 hover:to-orange-500 transition cursor-pointer flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <Suspense fallback={<div className="h-screen bg-[#0e0a07]" />}>
      <ChatContent />
    </Suspense>
  )
}