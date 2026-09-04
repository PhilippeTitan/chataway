'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckIcon, WarningIcon, UserIcon } from '@/components/icons'
import { useUser } from '@/utils/supabase/useUser'

export default function Landing() {
  const router = useRouter()
  const { user, isAnonymous, signInAnonymously, signOut } = useUser()
  const [step, setStep] = useState<'age' | 'tos' | 'gender'>('age')
  const [gender, setGender] = useState<'man' | 'woman' | null>(null)

  // Ensure an anonymous session is provisioned once TOS is accepted if user is not already logged in
  const handleAcceptTos = async () => {
    if (!user) {
      await signInAnonymously()
    }
    setStep('gender')
  }

  const handleGenderSelect = (g: 'man' | 'woman') => {
    setGender(g)
    sessionStorage.setItem('gender', g)
    router.push('/interests')
  }

  const renderTopBar = () => (
    <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
      <div className="text-sm font-semibold tracking-wider text-gray-500 uppercase">
        CHATAway
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2 text-xs bg-gray-900 border border-gray-800 py-1.5 px-3 rounded-full text-gray-300">
            <span
              className={`w-2 h-2 rounded-full ${
                isAnonymous ? 'bg-yellow-500' : 'bg-green-500'
              }`}
            ></span>
            <span>{isAnonymous ? 'Guest Session' : user.email}</span>
            {isAnonymous ? (
              <Link
                href="/login"
                className="ml-2 text-purple-400 hover:text-purple-300 font-medium underline"
              >
                Sign In
              </Link>
            ) : (
              <button
                onClick={() => signOut()}
                className="ml-2 text-gray-400 hover:text-white cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs bg-gray-900 hover:bg-gray-800 border border-gray-800 py-1.5 px-3.5 rounded-full text-gray-300 hover:text-white transition"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  )

  if (step === 'age') {
    return (
      <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        {renderTopBar()}
        <h1 className="text-5xl font-bold mb-4">CHATAway</h1>
        <p className="text-gray-400 mb-10 text-lg">Anonymous connections. No BS.</p>
        
        <div className="bg-gray-900 p-8 rounded-xl max-w-md w-full text-center">
          <WarningIcon className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <p className="text-xl mb-6">Are you 18 or older?</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => setStep('tos')}
              className="px-8 py-3 bg-green-600 rounded-lg text-lg font-semibold hover:bg-green-700 transition cursor-pointer flex items-center gap-2"
            >
              <CheckIcon className="w-5 h-5" /> Yes, I am
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
      <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        {renderTopBar()}
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
            onClick={handleAcceptTos}
            className="w-full py-3 bg-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-700 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckIcon className="w-5 h-5" /> I Accept
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      {renderTopBar()}
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