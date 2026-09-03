'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, VideoIcon, CloseIcon } from '@/components/icons'

export default function Queue() {
  const router = useRouter()
  const [dots, setDots] = useState('')
  const [time, setTime] = useState(0)

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    const timeInterval = setInterval(() => {
      setTime(prev => prev + 1)
    }, 1000)

    const matchTimeout = setTimeout(() => {
      router.push('/chat')
    }, 3000 + Math.random() * 5000)

    return () => {
      clearInterval(dotInterval)
      clearInterval(timeInterval)
      clearTimeout(matchTimeout)
    }
  }, [router])

  const gender = typeof window !== 'undefined' ? sessionStorage.getItem('gender') : 'man'

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="mb-8 animate-pulse">
        <SearchIcon className="w-20 h-20 text-blue-500" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Finding your match{dots}</h2>
      <p className="text-gray-400 mb-8">
        {gender === 'man' ? 'Looking for a woman...' : 'Looking for a man...'}
      </p>
      
      <p className="text-gray-500 text-sm mb-8">Waiting: {time}s</p>

      <div className="flex gap-4">
        <button 
          onClick={() => router.push('/solo')}
          className="px-6 py-3 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition cursor-pointer flex items-center gap-2"
        >
          <VideoIcon className="w-5 h-5" /> Watch Solo
        </button>
        <button 
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-red-600 rounded-lg font-semibold hover:bg-red-700 transition cursor-pointer flex items-center gap-2"
        >
          <CloseIcon className="w-5 h-5" /> Cancel
        </button>
      </div>
    </div>
  )
}