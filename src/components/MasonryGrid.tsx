'use client'

import ClipCard from './ClipCard'
import type { Clip } from '@/types/clips'

interface MasonryGridProps {
  clips: Clip[]
  onClipClick: (clip: Clip, index: number) => void
}

export default function MasonryGrid({ clips, onClipClick }: MasonryGridProps) {
  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 stagger-children">
      {clips.map((clip, index) => (
        <div key={clip.clipId} className="animate-slide-up">
          <ClipCard
            clipId={clip.clipId}
            title={clip.title}
            username={clip.username}
            thumbnail={clip.thumbnail}
            duration={clip.duration}
            views={clip.views}
            likes={clip.likes}
            verified={clip.verified}
            onClick={() => onClipClick(clip, index)}
          />
        </div>
      ))}
    </div>
  )
}
