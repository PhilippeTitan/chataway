export interface Clip {
  clipId: string
  title: string
  username: string
  thumbnail: string | null
  hdUrl: string | null
  sdUrl: string | null
  preview?: string | null
  duration: number | null
  views: number | null
  likes: number | null
  tags: string[]
  verified: boolean
  site: string
  hash: string
}

export interface Niche {
  id: string
  name: string
  icon: string
}
