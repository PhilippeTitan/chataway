'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SunsetBackdrop from '@/components/SunsetBackdrop'
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
        } else if (data.session || data.user) {
          setSuccessMsg('Account created successfully! Welcome to the sanctuary.')
          setTimeout(() => router.push('/'), 1200)
        } else {
          setSuccessMsg('Account created! Please check your email to confirm.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setErrorMsg(error.message)
        } else {
          setSuccessMsg('Signed in! Welcome back.')
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
    <div className="relative min-h-screen text-[#f5ebe0] flex flex-col items-center justify-center px-4 py-12 selection:bg-amber-800/40 selection:text-amber-200">
      <SunsetBackdrop />

      {/* Header Back Button */}
      <div className="relative z-10 w-full max-w-md mb-6 flex justify-between items-center">
        <button
          onClick={() => router.push('/')}
          className="text-[#b5a290] hover:text-[#fef9f5] flex items-center gap-2 text-xs md:text-sm transition cursor-pointer"
        >
          <BackIcon className="w-4 h-4 text-amber-400/80" />
          <span>Back to Sanctuary</span>
        </button>
        <span className="text-[11px] px-3 py-1 bg-[#231811]/80 text-amber-400/80 rounded-full border border-amber-900/40">
          Private Key Auth
        </span>
      </div>

      <div className="relative z-10 backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 p-8 md:p-10 rounded-3xl max-w-md w-full shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)]">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-tr from-amber-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-950/50">
            <UserIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif text-[#fef9f5] font-light tracking-wide">
            {mode === 'signin' ? 'Sign In' : 'Create an Account'}
          </h1>
          <p className="text-[#b5a290] text-xs md:text-sm mt-1.5 font-light">
            {mode === 'signin'
              ? 'Access saved preferences, match history & favorites'
              : 'Save your identity and favorite themes across devices'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#140d08]/80 p-1 rounded-xl mb-6 border border-amber-900/30">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition cursor-pointer ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow'
                : 'text-[#a89582] hover:text-[#fef9f5]'
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
            className={`flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition cursor-pointer ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow'
                : 'text-[#a89582] hover:text-[#fef9f5]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs md:text-sm flex items-start gap-2.5">
            <WarningIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-amber-950/60 border border-amber-800/80 rounded-xl text-amber-200 text-xs md:text-sm flex items-start gap-2.5">
            <CheckIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[#c7b5a3] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 bg-[#140d08]/80 border border-amber-900/35 rounded-xl text-white placeholder-[#786452] focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#c7b5a3] uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-[#140d08]/80 border border-amber-900/35 rounded-xl text-white placeholder-[#786452] focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-medium transition cursor-pointer disabled:opacity-50 mt-2 shadow-[0_8px_20px_-4px_rgba(234,88,12,0.4)]"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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
            <div className="w-full border-t border-amber-900/30"></div>
          </div>
          <span className="relative px-3 bg-[#1c130d] text-[10px] text-[#8c7867] uppercase tracking-wider">
            or continue freely
          </span>
        </div>

        {/* Quick Guest Continue */}
        <button
          type="button"
          onClick={handleGuestContinue}
          disabled={loading}
          className="w-full py-3 bg-[#241a13]/80 hover:bg-[#2f2118] border border-amber-900/40 text-[#c7b5a3] hover:text-[#fef9f5] rounded-xl font-medium text-xs md:text-sm transition cursor-pointer flex items-center justify-center gap-2"
        >
          Continue as Anonymous Guest
        </button>
      </div>

      <p className="text-[#8c7867] text-xs mt-6 text-center">
        By continuing you confirm you are 18+ and accept our{' '}
        <Link href="/" className="underline hover:text-[#c7b5a3]">
          House Rules & Privacy
        </Link>
        .
      </p>
    </div>
  )
}
