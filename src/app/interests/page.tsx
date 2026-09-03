'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const allInterests = [
  'Amateur', 'Anal', 'Asian', 'BBW', 'Big Ass', 'Big Tits', 'Blonde', 'Blowjob',
  'Brunette', 'Creampie', 'Cowgirl', 'Deepthroat', 'Doggy', 'Facial', 'Hentai',
  'Interracial', 'Lesbian', 'Masturbation', 'MILF', 'Orgasm', 'POV', 'Public',
  'Redhead', 'Rough', 'Solo', 'Squirting', 'Teen', 'Threesome', 'Titty Fuck',
  'Webcam', 'Young'
]

export default function Interests() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (interest: string) => {
    setSelected(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : prev.length < 15 
          ? [...prev, interest]
          : prev
    )
  }

  const handleNext = () => {
    sessionStorage.setItem('interests', JSON.stringify(selected))
    router.push('/queue')
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h2 className="text-3xl font-bold mb-2">Pick your interests</h2>
      <p className="text-gray-400 mb-8">Up to 15 tags • Helps us match you better</p>
      
      <div className="flex flex-wrap gap-3 justify-center max-w-2xl mb-8">
        {allInterests.map(interest => (
          <button
            key={interest}
            onClick={() => toggle(interest)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition cursor-pointer ${
              selected.includes(interest)
                ? 'bg-white text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {interest}
          </button>
        ))}
      </div>

      <p className="text-gray-500 mb-4">{selected.length}/15 selected</p>

      <div className="flex gap-4">
        <button 
          onClick={() => { sessionStorage.setItem('interests', '[]'); router.push('/queue') }}
          className="px-8 py-3 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition cursor-pointer"
        >
          Skip
        </button>
        <button 
          onClick={handleNext}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-pink-600 rounded-lg font-semibold hover:opacity-90 transition cursor-pointer"
        >
          Find Match
        </button>
      </div>
    </div>
  )
}