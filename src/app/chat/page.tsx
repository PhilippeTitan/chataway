'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VideoIcon, SkipIcon, CloseIcon, SendIcon } from '@/components/icons'

interface Message {
  id: number
  sender: 'me' | 'them'
  text: string
  time: string
}

export default function Chat() {
  const router = useRouter()
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
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-gray-400">Anonymous User</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/watch')}
            className="px-4 py-2 bg-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-700 transition cursor-pointer flex items-center gap-2"
          >
            <VideoIcon className="w-4 h-4" /> Watch Together
          </button>
          {showSkip && (
            <button 
              onClick={() => router.push('/queue')}
              className="px-4 py-2 bg-red-600 rounded-lg text-sm font-semibold hover:bg-red-700 transition cursor-pointer flex items-center gap-2"
            >
              <SkipIcon className="w-4 h-4" /> Skip
            </button>
          )}
          <button 
            onClick={() => router.push('/end')}
            className="px-4 py-2 bg-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-600 transition cursor-pointer flex items-center gap-2"
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
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-200'
            }`}>
              <p>{msg.text}</p>
              <p className="text-xs opacity-50 mt-1">{msg.time}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition cursor-pointer flex items-center gap-2"
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