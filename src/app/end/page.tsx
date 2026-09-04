'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SunsetBackdrop from '@/components/SunsetBackdrop'
import { StarIcon, SearchIcon, VideoIcon, ReportIcon, HomeIcon, RefreshIcon, CheckIcon, UserIcon } from '@/components/icons'
import { useUser } from '@/utils/supabase/useUser'

export default function End() {
  const router = useRouter()
  const { user, isAnonymous } = useUser()
  const [rating, setRating] = useState<number | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const reportReasons = [
    'Inappropriate behavior',
    'Bot / fake account',
    'Harassment',
    'Underage suspect',
    'Spam / advertising',
    'Other'
  ]

  const handleSubmit = () => {
    setSubmitted(true)
    setTimeout(() => router.push('/'), 2000)
  }

  if (submitted) {
    return (
      <div className="relative min-h-dvh text-[#f5ebe0] flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom selection:bg-amber-800/40 selection:text-amber-200">
        <SunsetBackdrop />
        <div className="relative z-10 backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] text-center max-w-md w-full animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <CheckIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-serif text-[#fef9f5] font-light tracking-wide mb-2">Thank you</h2>
          <p className="text-sm text-[#b5a290]">Your feedback helps keep the sanctuary safe. Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh text-[#f5ebe0] flex flex-col items-center justify-center px-4 py-12 safe-top safe-bottom selection:bg-amber-800/40 selection:text-amber-200">
      <SunsetBackdrop />

      <main className="relative z-10 w-full max-w-md mx-auto backdrop-blur-2xl bg-[#1c130d]/75 border border-amber-900/35 rounded-3xl p-8 md:p-12 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,235,224,0.12)] animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="inline-block uppercase tracking-[0.25em] text-[11px] font-medium text-amber-400/90 mb-2">
            Session Complete
          </span>
          <h1 className="text-2xl md:text-3xl font-serif text-[#fef9f5] font-light tracking-wide mb-2">
            Thanks for the company
          </h1>
          <p className="text-sm text-[#b5a290]">
            How was your time together?
          </p>
        </div>

        {/* Rating */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`transition-all duration-200 cursor-pointer btn-press ${
                  rating && star <= rating
                    ? 'scale-110 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : 'text-[#3d2e22] hover:text-[#6b5240]'
                }`}
              >
                <StarIcon className="w-10 h-10" filled={!!(rating && star <= rating)} />
              </button>
            ))}
          </div>
          {rating && (
            <p className="text-xs text-[#a89582] mt-2 animate-fade-in">
              {rating <= 2 ? 'Sorry to hear that' : rating <= 3 ? 'Not bad!' : rating === 4 ? 'Great time!' : 'Perfect match!'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/queue')}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl font-medium text-sm transition-all duration-300 shadow-[0_8px_24px_-4px_rgba(234,88,12,0.4)] hover:shadow-[0_12px_32px_-4px_rgba(234,88,12,0.6)] cursor-pointer flex items-center justify-center gap-2 btn-press"
          >
            <SearchIcon className="w-4 h-4 text-amber-200" /> Find Another Match
          </button>

          <button
            onClick={() => router.push('/solo')}
            className="w-full py-3 bg-[#231811]/80 hover:bg-[#2d2017] border border-amber-900/35 text-[#d4c3b3] hover:text-[#fef9f5] rounded-2xl font-medium text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 btn-press"
          >
            <VideoIcon className="w-4 h-4 text-amber-400/80" /> Watch Solo in Lounge
          </button>

          <button
            onClick={() => setReportOpen(!reportOpen)}
            className="w-full py-3 bg-[#2a1515]/60 hover:bg-[#351c1c]/70 border border-red-900/30 text-red-300/80 hover:text-red-200 rounded-2xl font-medium text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 btn-press"
          >
            <ReportIcon className="w-4 h-4" /> Report User
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-[#1a120c]/60 hover:bg-[#241a13]/70 border border-amber-950 text-[#8c7867] hover:text-[#b5a290] rounded-2xl font-medium text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 btn-press"
          >
            <HomeIcon className="w-4 h-4" /> Back to Sanctuary
          </button>

          {(!user || isAnonymous) && (
            <Link
              href="/login"
              className="block w-full py-2.5 text-center text-xs text-purple-400/80 hover:text-purple-300 font-medium hover:underline transition"
            >
              Save favorites & preferences? Create an account
            </Link>
          )}
        </div>

        {/* Report Form */}
        {reportOpen && (
          <div className="mt-6 p-4 bg-[#1a0f0a]/80 border border-red-900/30 rounded-2xl animate-expand">
            <p className="text-xs text-[#a89582] mb-3 uppercase tracking-wider">Select reason</p>
            <div className="space-y-2">
              {reportReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer btn-press ${
                    reportReason === reason
                      ? 'bg-red-950/60 border border-red-800/60 text-red-200'
                      : 'bg-[#1a120c]/40 border border-amber-950 text-[#a89582] hover:text-[#d4c3b3] hover:border-amber-800/40'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!reportReason}
              className="w-full mt-4 py-2.5 bg-red-900/60 hover:bg-red-800/60 border border-red-700/40 rounded-xl text-sm font-semibold text-red-200 transition-all cursor-pointer disabled:opacity-40 btn-press flex items-center justify-center gap-2"
            >
              <ReportIcon className="w-4 h-4" /> Submit Report
            </button>
          </div>
        )}
      </main>

      <p className="relative z-10 text-[11px] text-[#8c7867] mt-6 tracking-wider">
        Warm ocean air · Discretion guaranteed
      </p>
    </div>
  )
}
