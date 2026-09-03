'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function End() {
  const router = useRouter()
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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="text-6xl mb-6">✅</div>
        <h2 className="text-2xl font-bold mb-2">Thanks for your feedback</h2>
        <p className="text-gray-400">Redirecting to home...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="bg-gray-900 p-8 rounded-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Session Ended</h2>

        {/* Rating */}
        <div className="text-center mb-6">
          <p className="text-gray-400 mb-3">Rate your match</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-3xl transition cursor-pointer ${rating && star <= rating ? 'scale-110' : 'opacity-50 hover:opacity-75'}`}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button 
            onClick={() => router.push('/queue')}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-pink-600 rounded-lg font-semibold hover:opacity-90 transition cursor-pointer"
          >
            Find Another Match
          </button>
          
          <button 
            onClick={() => router.push('/queue')}
            className="w-full py-3 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition cursor-pointer"
          >
            🔁 Find Same Person
          </button>

          <button 
            onClick={() => router.push('/solo')}
            className="w-full py-3 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition cursor-pointer"
          >
            🎬 Watch Solo
          </button>

          <button 
            onClick={() => setReportOpen(!reportOpen)}
            className="w-full py-3 bg-red-600/20 text-red-500 rounded-lg font-semibold hover:bg-red-600/30 transition cursor-pointer"
          >
            🚨 Report User
          </button>

          <button 
            onClick={() => router.push('/')}
            className="w-full py-3 bg-gray-800 rounded-lg font-semibold hover:bg-gray-700 transition cursor-pointer"
          >
            Back to Home
          </button>
        </div>

        {/* Report Form */}
        {reportOpen && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-400 mb-3">Select reason:</p>
            <div className="space-y-2">
              {reportReasons.map(reason => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-2 rounded text-sm transition cursor-pointer ${
                    reportReason === reason 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button 
              onClick={handleSubmit}
              disabled={!reportReason}
              className="w-full mt-4 py-2 bg-red-600 rounded font-semibold hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
            >
              Submit Report
            </button>
          </div>
        )}
      </div>
    </div>
  )
}