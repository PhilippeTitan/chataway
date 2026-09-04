'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { CheckIcon, WarningIcon, UserIcon, BackIcon } from '@/components/icons'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          setErrorMsg(error.message)
        } else if (data.session) {
          // Instant sign in without confirmation requirement
          setSuccessMsg('Account created successfully! Redirecting...')
          setTimeout(() => router.push('/'), 1200)
        } else {
          // Email confirmation link sent
          setSuccessMsg('Account created! Please check your email to confirm your account.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setErrorMsg(error.message)
        } else {
          setSuccessMsg('Signed in! Redirecting...')
          setTimeout(() => router.push('/'), 1000)
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestContinue = async () => {
    setLoading(true)
    try {
      await supabase.auth.signInAnonymously()
      router.push('/')
    } catch {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12">
      {/* Header Back Button */}
      <div className="w-full max-w-md mb-6 flex justify-between items-center">
        <button
          onClick={() => router.push('/')}
          className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition cursor-pointer"
        >
          <BackIcon className="w-4 h-4" /> Back to CHATAway
        </button>
        <span className="text-xs px-2.5 py-1 bg-gray-800 text-gray-400 rounded-full border border-gray-700">
          Supabase Auth
        </span>
      </div>

      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-900/30">
            <UserIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">
            {mode === 'signin' ? 'Sign In to CHATAway' : 'Create an Account'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'signin'
              ? 'Access saved preferences, match history & favorites'
              : 'Keep your identity and save your favorite tags across devices'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-800 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              mode === 'signin'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              mode === 'signup'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-sm flex items-start gap-2.5">
            <WarningIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-green-950/60 border border-green-800/80 rounded-xl text-green-200 text-sm flex items-start gap-2.5">
            <CheckIcon className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-semibold transition cursor-pointer disabled:opacity-50 mt-2 shadow-lg shadow-purple-900/40"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </span>
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <span className="relative px-3 bg-gray-900 text-xs text-gray-500 uppercase tracking-wider">
            or
          </span>
        </div>

        {/* Quick Guest Continue */}
        <button
          type="button"
          onClick={handleGuestContinue}
          disabled={loading}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-xl font-medium text-sm transition cursor-pointer flex items-center justify-center gap-2"
        >
          Continue as Anonymous Guest
        </button>
      </div>

      <p className="text-gray-500 text-xs mt-6 text-center">
        By continuing you confirm you are 18+ and agree to our{' '}
        <Link href="/" className="underline hover:text-gray-400">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  )
}
