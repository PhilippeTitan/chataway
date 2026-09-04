import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

interface QueueEntry {
  id: string
  gender: 'man' | 'woman'
  interests: string[]
  joinedAt: number
  matchId?: string
  partnerId?: string
  isBot?: boolean
}

interface Match {
  id: string
  participants: [string, string]
  createdAt: number
}

const queue = new Map<string, QueueEntry>()
const matches = new Map<string, Match>()
const MATCH_TTL = 10 * 60 * 1000

function cleanupExpired() {
  const cutoff = Date.now() - MATCH_TTL
  for (const [id, entry] of queue) {
    if (entry.joinedAt < cutoff) queue.delete(id)
  }
  for (const [id, match] of matches) {
    if (match.createdAt < cutoff) matches.delete(id)
  }
}

function compatible(first: QueueEntry, second: QueueEntry) {
  if (first.id === second.id || first.gender === second.gender) return false
  if (first.interests.length === 0 || second.interests.length === 0) return true
  return first.interests.some(interest => second.interests.includes(interest))
}

function response(entry: QueueEntry) {
  return NextResponse.json({
    status: entry.matchId ? 'matched' : 'waiting',
    matchId: entry.matchId || null,
    partnerId: entry.partnerId || null,
    isBot: entry.isBot || false,
    waiting: !entry.matchId,
  })
}

function matchWithBot(entry: QueueEntry) {
  const bot: QueueEntry = {
    id: `test-bot-${entry.gender}`,
    gender: entry.gender === 'man' ? 'woman' : 'man',
    interests: entry.interests,
    joinedAt: Date.now(),
    isBot: true,
  }
  const matchId = randomUUID()
  entry.matchId = matchId
  entry.partnerId = bot.id
  bot.matchId = matchId
  bot.partnerId = entry.id
  queue.set(bot.id, bot)
  matches.set(matchId, {
    id: matchId,
    participants: [entry.id, bot.id],
    createdAt: Date.now(),
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
    if (existing?.matchId) return response(existing)

    const entry: QueueEntry = existing || { id, gender, interests, joinedAt: Date.now() }
    entry.gender = gender
    entry.interests = interests
    entry.joinedAt = existing?.joinedAt || Date.now()

    const partner = [...queue.values()]
      .filter(candidate => !candidate.matchId)
      .sort((first, second) => first.joinedAt - second.joinedAt)
      .find(candidate => compatible(entry, candidate))

    if (partner) {
      const matchId = randomUUID()
      entry.matchId = matchId
      entry.partnerId = partner.id
      partner.matchId = matchId
      partner.partnerId = entry.id
      matches.set(matchId, {
        id: matchId,
        participants: [entry.id, partner.id],
        createdAt: Date.now(),
      })
    }

    queue.set(id, entry)
    return response(entry)
  } catch {
    return NextResponse.json({ error: 'Unable to join matchmaking' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  cleanupExpired()
  const id = request.nextUrl.searchParams.get('id')?.trim() || ''
  const entry = queue.get(id)

  if (!entry) return NextResponse.json({ status: 'left', matchId: null, waiting: false })
  if (!entry.matchId && Date.now() - entry.joinedAt >= 5000) matchWithBot(entry)
  return response(entry)
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim() || ''
  const entry = queue.get(id)
  if (entry?.matchId) matches.delete(entry.matchId)
  queue.delete(id)
  return NextResponse.json({ status: 'left' })
}
