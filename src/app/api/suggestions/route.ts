import { NextResponse } from 'next/server'

const PH_API = 'https://www.pornhub.com/webmasters/search'

async function fetchVideos(query: string, page = 1): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(
      `${PH_API}?search=${encodeURIComponent(query)}&page=${page}`,
      { headers: { 'User-Agent': 'CHATAway/1.0' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.videos || []
  } catch {
    return []
  }
}

function extractKeywords(videos: Record<string, unknown>[]): { text: string; type: string }[] {
  const wordCounts = new Map<string, number>()
  const skip = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'my', 'her', 'his', 'our', 'your', 'this',
    'that', 'all', 'new', 'hot', 'best', 'big', 'no', 'so', 'if', 'up', 'do', 'has',
    'its', 'am', 'be', 'as', 'was', 'are', 'been', 'not', 'who', 'how', 'can'])

  for (const v of videos) {
    const title = String(v.title || '').toLowerCase()
    const words = title.split(/[\s\-_]+/).filter(w => w.length > 2 && !skip.has(w) && !/^\d+$/.test(w))
    for (const w of words) {
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1)
    }
  }

  return [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => ({
      text: word.charAt(0).toUpperCase() + word.slice(1),
      type: 'trending'
    }))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''

  try {
    let suggestions: { text: string; type: string }[] = []

    if (q.length > 0) {
      // Fetch real videos matching the query
      const videos = await fetchVideos(q)
      
      // Extract keywords from titles as suggestions
      const keywords = extractKeywords(videos)
      
      // Build suggestions: related keywords from real results
      suggestions = keywords.slice(0, 8).map(k => ({
        text: `${q} ${k.text}`,
        type: 'suggestion'
      }))
    } else {
      // Fetch popular/trending videos to show real trending searches
      const popular = await fetchVideos('popular', 1)
      const newest = await fetchVideos('new', 1)
      const allVideos = [...popular, ...newest]
      
      suggestions = extractKeywords(allVideos).slice(0, 8)
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    return NextResponse.json({ suggestions: [], error: String(error) })
  }
}
