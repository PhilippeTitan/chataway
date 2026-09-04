import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

async function searchVideos(query: string, page = 1): Promise<Record<string, unknown>[]> {
  try {
    const { stdout } = await execFileAsync(
      'python3',
      ['scripts/xvideos_search.py', query, String(page), 'relevance'],
      { timeout: 15000 }
    )
    return JSON.parse(stdout)
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
      const videos = await searchVideos(q)
      const keywords = extractKeywords(videos)
      suggestions = keywords.slice(0, 8).map(k => ({
        text: `${q} ${k.text}`,
        type: 'suggestion'
      }))
    } else {
      const popular = await searchVideos('popular', 1)
      const newest = await searchVideos('new', 1)
      const allVideos = [...popular, ...newest]
      suggestions = extractKeywords(allVideos).slice(0, 8)
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    return NextResponse.json({ suggestions: [], error: String(error) })
  }
}
