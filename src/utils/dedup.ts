/**
 * Client-Side Deduplication Engine [Q014, Q027, Q33]
 * 100% private and on-device. Zero server profiling.
 * Tracks seen video/clip hashes in localStorage with 30-day auto-expiry.
 */

const STORAGE_KEY = 'chataway_seen_hashes'
const ROLLING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30 rolling days [Q014]

interface SeenRecord {
  timestamp: number
}

function getSeenMap(): Record<string, SeenRecord> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SeenRecord>
    const now = Date.now()

    // Prune entries older than 30 days
    const active: Record<string, SeenRecord> = {}
    for (const [hash, entry] of Object.entries(parsed)) {
      if (now - entry.timestamp < ROLLING_WINDOW_MS) {
        active[hash] = entry
      }
    }
    return active
  } catch {
    return {}
  }
}

function saveSeenMap(map: Record<string, SeenRecord>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {}
}

/** Check if a video hash was seen in the last 30 days */
export function isSeen(hash: string): boolean {
  if (!hash) return false
  const map = getSeenMap()
  return Boolean(map[hash])
}

/** Mark a video hash as seen */
export async function markSeen(video: { hash?: string }): Promise<void> {
  if (!video.hash) return
  const map = getSeenMap()
  map[video.hash] = { timestamp: Date.now() }
  saveSeenMap(map)
}

/** Filter unseen videos from a list */
export async function filterSeen<T extends { hash?: string }>(videos: T[]): Promise<T[]> {
  const map = getSeenMap()
  return videos.filter((v) => !v.hash || !map[v.hash])
}

/** Manual reset: Purge all 30-day seen history [Q014] */
export function resetSeenHistory(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
