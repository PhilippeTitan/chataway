'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Landing() {
  const router = useRouter()
  const [step, setStep] = useState<'age' | 'tos' | 'gender'>('age')
  const [gender, setGender] = useState<'man' | 'woman' | null>(null)

  const handleGenderSelect = (g: 'man' | 'woman') => {
    setGender(g)
    sessionStorage.setItem('gender', g)
    router.push('/interests')
  }

  if (step === 'age') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-5xl font-bold mb-4">CHATAway</h1>
        <p className="text-gray-400 mb-10 text-lg">Anonymous connections. No BS.</p>
        
        <div className="bg-gray-900 p-8 rounded-xl max-w-md w-full text-center">
          <p className="text-xl mb-6">Are you 18 or older?</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => setStep('tos')}
              className="px-8 py-3 bg-green-600 rounded-lg text-lg font-semibold hover:bg-green-700 transition cursor-pointer"
            >
              Yes, I am
            </button>
            <button 
              onClick={() => window.location.href = 'https://google.com'}
              className="px-8 py-3 bg-gray-700 rounded-lg text-lg font-semibold hover:bg-gray-600 transition cursor-pointer"
            >
              No
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'tos') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-5xl font-bold mb-4">CHATAway</h1>
        <p className="text-gray-400 mb-10 text-lg">Anonymous connections. No BS.</p>
        
        <div className="bg-gray-900 p-8 rounded-xl max-w-lg w-full">
          <h2 className="text-2xl font-bold mb-4">Terms of Service</h2>
          <div className="text-sm text-gray-400 mb-6 max-h-60 overflow-y-auto space-y-3">
            <p>By entering you agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are 18+ years old</li>
              <li>No sharing of personal information</li>
              <li>No harassment or hate speech</li>
              <li>No bots or automated accounts</li>
              <li>No screen recording without consent</li>
              <li>Community reporting is enabled</li>
              <li>Violations result in permanent ban</li>
            </ul>
          </div>
          <button 
            onClick={() => setStep('gender')}
            className="w-full py-3 bg-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-700 transition cursor-pointer"
          >
            I Accept
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold mb-4">CHATAway</h1>
      <p className="text-gray-400 mb-10 text-lg">Anonymous connections. No BS.</p>
      
      <div className="bg-gray-900 p-8 rounded-xl max-w-md w-full text-center">
        <p className="text-xl mb-6">I am a...</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => handleGenderSelect('man')}
            className="px-10 py-5 bg-blue-600 rounded-lg text-xl font-semibold hover:bg-blue-700 transition cursor-pointer"
          >
            Man
          </button>
          <button 
            onClick={() => handleGenderSelect('woman')}
            className="px-10 py-5 bg-pink-600 rounded-lg text-xl font-semibold hover:bg-pink-700 transition cursor-pointer"
          >
            Woman
          </button>
        </div>
      </div>
    </div>
  )
}