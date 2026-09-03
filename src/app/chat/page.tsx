'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  id: number
  sender: 'me' | 'them'
  text: string
  image?: string
  time: string
}

export default function Chat() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [showSkip, setShowSkip] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

  const emojis = ['😏', '🔥', '😍', '💕', '💦', '😈', '🥵', '😭', '✊', '🤤']

  useEffect(() => {
    // Show skip button after 10 seconds
    const timer = setTimeout(() => setShowSkip(true), 10000)
    
    // Random "them" messages for demo
    const demoMessages = [
      { id: 1, sender: 'them' as const, text: 'Hey :) what are you into?', time: '2:30 PM' },
    ]
    
    setTimeout(() => {
      setMessages(demoMessages)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!input.trim()) return
    
    const newMsg: Message = {
      id: Date.now(),
      sender: 'me',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    setMessages(prev => [...prev, newMsg])
    setInput('')

    // Simulate reply
    setTimeout(() => {
      const replies = [
        'Nice! Tell me more 😏',
        'I like that too 🔥',
        'Hmm interesting...',
        'What else do you like?',
        'Show me? 😈',
      ]
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'them',
        text: replies[Math.floor(Math.random() * replies.length)],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    }, 1000 + Math.random() * 2000)
  }

  const sendEmoji = (emoji: string) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'me',
      text: emoji,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
    setShowEmoji(false)
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <span className="text-green-500 text-sm">● Connected</span>
          <span className="ml-4 text-gray-400">Anonymous User</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/watch')}
            className="px-4 py-2 bg-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-700 transition cursor-pointer"
          >
            🎬 Watch Together
          </button>
          {showSkip && (
            <button 
              onClick={() => router.push('/queue')}
              className="px-4 py-2 bg-red-600 rounded-lg text-sm font-semibold hover:bg-red-700 transition cursor-pointer"
            >
              ⏭ Skip
            </button>
          )}
          <button 
            onClick={() => router.push('/end')}
            className="px-4 py-2 bg-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-600 transition cursor-pointer"
          >
            ✕ End
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-4xl mb-4">💬</p>
            <p>Waiting for messages...</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
              msg.sender === 'me' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-200'
            } ${msg.text.length <= 2 ? 'text-3xl px-2 py-1' : ''}`}>
              <p>{msg.text}</p>
              <p className="text-xs opacity-50 mt-1">{msg.time}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <div className="flex gap-2 justify-center">
            {emojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => sendEmoji(emoji)}
                className="text-2xl hover:scale-125 transition cursor-pointer p-2"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="px-4 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition cursor-pointer text-xl"
          >
            😊
          </button>
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
            className="px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}