// Deduplication utility functions

const LOCAL_STORAGE_PREFIX = 'seen_'
const USER_ID_KEY = 'chataway_user_id'

// Generate or retrieve user ID
export function getUserId(): string {
  if (typeof window === 'undefined') return 'server'
  
  let userId = localStorage.getItem(USER_ID_KEY)
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    localStorage.setItem(USER_ID_KEY, userId)
  }
  return userId
}

// Check if video is seen in localStorage (fast check)
export function isSeenLocal(hash: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${hash}`) === 'true'
}

// Mark video as seen in localStorage
export function markSeenLocal(hash: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${hash}`, 'true')
}

// Check if videos are seen via Supabase (cross-user)
export async function checkSeenSupabase(hashes: string[]): Promise<string[]> {
  try {
    const userId = getUserId()
    const res = await fetch('/api/dedup/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, hashes }),
    })
    const data = await res.json()
    return data.seenHashes || []
  } catch {
    return []
  }
}

// Mark video as seen in Supabase
export async function markSeenSupabase(hash: string, site: string, videoId: string): Promise<void> {
  try {
    const userId = getUserId()
    await fetch('/api/dedup/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, hash, site, videoId }),
    })
  } catch {
    // Silent fail - localStorage is primary
  }
}

// Filter out seen videos from results
export async function filterSeen<T extends { hash?: string; site?: string; videoId?: string }>(videos: T[]): Promise<T[]> {
  // First, filter by localStorage (instant)
  const unseen = videos.filter(v => (v.hash ? !isSeenLocal(v.hash) : true))
  
  if (unseen.length === 0) return []
  
  // Then, check Supabase for cross-user dedup
  const hashesToCheck = unseen.map(v => v.hash).filter(Boolean) as string[]
  if (hashesToCheck.length === 0) return unseen

  const seenHashes = await checkSeenSupabase(hashesToCheck)
  
  return unseen.filter(v => !v.hash || !seenHashes.includes(v.hash))
}

// Mark a video as seen (both local and Supabase)
export async function markSeen(video: { hash?: string; site?: string; videoId?: string }): Promise<void> {
  if (video.hash) {
    markSeenLocal(video.hash)
    if (video.site && video.videoId) {
      await markSeenSupabase(video.hash, video.site, video.videoId)
    }
  }
}
