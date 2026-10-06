import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, createHmac } from 'crypto'

interface QueueEntry {
  id: string
  gender: 'man' | 'woman'
  interests: string[]
  joinedAt: number
  matchId?: string
  partnerId?: string
  sessionToken?: string
  isBot?: boolean
}

interface Match {
  id: string
  participants: [string, string]
  createdAt: number
  sessionToken: string
}

const queue = new Map<string, QueueEntry>()
const matches = new Map<string, Match>()
const MATCH_TTL = 15 * 60 * 1000 // 15 minutes TTL
const BOT_FALLBACK_TIMEOUT = 30 * 1000 // 30s graceful wait before bot availability
const SECRET_SALT = process.env.SESSION_SECRET || 'chataway-sanctuary-salt-2026'

function cleanupExpired() {
  const cutoff = Date.now() - MATCH_TTL
  for (const [id, entry] of queue) {
    if (entry.joinedAt < cutoff) queue.delete(id)
  }
  for (const [id, match] of matches) {
    if (match.createdAt < cutoff) matches.delete(id)
  }
}

/**
 * Calculates Jaccard similarity affinity between two interest sets.
 * Strictly enforces Heterosexual matching: (man <-> woman).
 */
function calculateAffinity(first: QueueEntry, second: QueueEntry): number {
  // Heterosexual matching strictly enforced ([Q002])
  if (first.id === second.id || first.gender === second.gender) return -1

  // If either has no explicit tags, baseline compatibility is granted (affinity 0.1)
  if (first.interests.length === 0 || second.interests.length === 0) return 0.1

  const setA = new Set(first.interests)
  const setB = new Set(second.interests)
  let intersectionCount = 0

  for (const tag of setA) {
    if (setB.has(tag)) intersectionCount++
  }

  const unionSize = new Set([...first.interests, ...second.interests]).size
  return unionSize > 0 ? intersectionCount / unionSize : 0.1
}

function generateSessionToken(matchId: string, user1: string, user2: string): string {
  return createHmac('sha256', SECRET_SALT)
    .update(`${matchId}:${user1}:${user2}:${Date.now()}`)
    .digest('hex')
    .slice(0, 32)
}

function createResponse(entry: QueueEntry) {
  return NextResponse.json({
    status: entry.matchId ? 'matched' : 'waiting',
    matchId: entry.matchId || null,
    partnerId: entry.partnerId || null,
    sessionToken: entry.sessionToken || null,
    isBot: entry.isBot || false,
    waiting: !entry.matchId,
    joinedAt: entry.joinedAt,
    estimatedWaitSec: 14,
  })
}

function matchWithBot(entry: QueueEntry) {
  const botGender: 'man' | 'woman' = entry.gender === 'man' ? 'woman' : 'man'
  const botId = `sanctuary-companion-${botGender}-${randomUUID().slice(0, 6)}`
  const bot: QueueEntry = {
    id: botId,
    gender: botGender,
    interests: entry.interests.length > 0 ? entry.interests : ['Sensual', 'Romance'],
    joinedAt: Date.now(),
    isBot: true,
  }

  const matchId = randomUUID()
  const token = generateSessionToken(matchId, entry.id, bot.id)
  entry.matchId = matchId
  entry.partnerId = bot.id
  entry.sessionToken = token

  bot.matchId = matchId
  bot.partnerId = entry.id
  bot.sessionToken = token

  queue.set(bot.id, bot)
  matches.set(matchId, {
    id: matchId,
    participants: [entry.id, bot.id],
    createdAt: Date.now(),
    sessionToken: token,
  })
}

export async function POST(request: NextRequest) {
  cleanupExpired()

  try {
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const gender = body.gender === 'man' || body.gender === 'woman' ? body.gender : null
    const interests = Array.isArray(body.interests)
      ? body.interests.filter((interest: unknown): interest is string => typeof interest === 'string').slice(0, 15)
      : []

    if (!id || !gender) {
      return NextResponse.json({ error: 'A queue id and gender are required' }, { status: 400 })
    }

    const existing = queue.get(id)
    if (existing?.matchId) return createResponse(existing)

    const entry: QueueEntry = existing || { id, gender, interests, joinedAt: Date.now() }
    entry.gender = gender
    entry.interests = interests
    entry.joinedAt = existing?.joinedAt || Date.now()

    // Find best compatible candidate ranked by Jaccard similarity and wait time
    const candidates = [...queue.values()]
      .filter(c => !c.matchId && c.id !== entry.id)
      .map(candidate => ({
        candidate,
        affinity: calculateAffinity(entry, candidate),
      }))
      .filter(item => item.affinity >= 0)
      .sort((a, b) => {
        // First sort by affinity score desc; if close, prioritize longer waiting candidate
        if (Math.abs(a.affinity - b.affinity) > 0.2) {
          return b.affinity - a.affinity
        }
        return a.candidate.joinedAt - b.candidate.joinedAt
      })

    if (candidates.length > 0) {
      const best = candidates[0].candidate
      const matchId = randomUUID()
      const token = generateSessionToken(matchId, entry.id, best.id)

      entry.matchId = matchId
      entry.partnerId = best.id
      entry.sessionToken = token

      best.matchId = matchId
      best.partnerId = entry.id
      best.sessionToken = token

      matches.set(matchId, {
        id: matchId,
        participants: [entry.id, best.id],
        createdAt: Date.now(),
        sessionToken: token,
      })
    }

    queue.set(id, entry)
    return createResponse(entry)
  } catch {
    return NextResponse.json({ error: 'Unable to join matchmaking' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  cleanupExpired()
  const id = request.nextUrl.searchParams.get('id')?.trim() || ''
  const allowBot = request.nextUrl.searchParams.get('allowBot') === '1'
  const entry = queue.get(id)

  if (!entry) return NextResponse.json({ status: 'left', matchId: null, waiting: false })

  // Only trigger bot fallback after extended wait (30s) if explicitly enabled ([Q004])
  if (!entry.matchId && allowBot && Date.now() - entry.joinedAt >= BOT_FALLBACK_TIMEOUT) {
    matchWithBot(entry)
  }

  return createResponse(entry)
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim() || ''
  const entry = queue.get(id)
  if (entry?.matchId) matches.delete(entry.matchId)
  queue.delete(id)
  return NextResponse.json({ status: 'left' })
}
