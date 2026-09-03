'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

    // Simulate finding a match after random time
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
      <div className="text-6xl mb-8 animate-pulse">🔍</div>
      
      <h2 className="text-2xl font-bold mb-2">Finding your match{dots}</h2>
      <p className="text-gray-400 mb-8">
        {gender === 'man' ? 'Looking for a woman...' : 'Looking for a man...'}
      </p>
      
      <p className="text-gray-500 text-sm mb-8">Waiting: {time}s</p>

      <div className="flex gap-4">
        <button 
          onClick={() => router.push('/solo')}
          className="px-6 py-3 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition cursor-pointer"
        >
          Watch Solo Instead
        </button>
        <button 
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-red-600 rounded-lg font-semibold hover:bg-red-700 transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}