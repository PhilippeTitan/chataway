import { NextResponse } from 'next/server'
import * as crypto from 'crypto'

function createHash(site: string, videoId: string): string {
  return crypto.createHash('sha256').update(`${site}_${videoId}`).digest('hex').slice(0, 16)
}

function extractVideoId(href: string): string | null {
  const match = href.match(/\/video[./]([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

const QUERY_ALIASES: Record<string, string> = {
  squrting: 'squirting',
  squirtting: 'squirting',
}

const GENERIC_TERMS = new Set(['video', 'videos'])

function normalizeQuery(query: string): string {
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return normalized
    .split(/\s+/)
    .map(term => QUERY_ALIASES[term] || term)
    .join(' ')
}

function curateResults(videos: Record<string, unknown>[], query: string): Record<string, unknown>[] {
  const normalizedQuery = normalizeQuery(query)
  const queryTerms = normalizedQuery.split(/\s+/).filter(term => term && !GENERIC_TERMS.has(term))
  if (queryTerms.length === 0) return videos

  return videos
    .map((video, index) => {
      const title = String(video.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')
      const allTermsMatch = queryTerms.every(term => title.includes(term))
      const matchedTerms = queryTerms.filter(term => title.includes(term)).length
      const exactPhraseMatch = title.includes(normalizedQuery)
      const score = (allTermsMatch ? 1000 : 0) + (exactPhraseMatch ? 500 : 0) + matchedTerms * 100 - index
      return { video, score, allTermsMatch }
    })
    .filter(result => result.allTermsMatch)
    .sort((first, second) => second.score - first.score)
    .map(result => result.video)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'amateur'
  const normalizedQuery = normalizeQuery(query)
  const page = searchParams.get('page') || '1'
  const sort = searchParams.get('sort') || 'relevance'

  try {
    const url = new URL('https://www.xvideos.com/')
    url.searchParams.set('k', normalizedQuery)
    url.searchParams.set('p', page)
    if (sort && sort !== 'relevance') {
      url.searchParams.set('sort', sort)
    }

    const resp = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!resp.ok) {
      return NextResponse.json({ error: `HTTP ${resp.status}` }, { status: 502 })
    }

    const html = await resp.text()

    // Parse video blocks using regex (no HTML parser needed in Node)
    const videos: Record<string, unknown>[] = []
    // XVideos wraps each result in a thumb-block div
    const blockRegex = /<div\s+class="thumb-block"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g
    let blockMatch

    // Simpler approach: find all links to /video... and extract surrounding context
     const linkRegex = /<a\s+[^>]*href="(\/video[./][a-zA-Z0-9]+\/[^"]+)"[^>]*title="([^"]*)"[^>]*>/g
    let linkMatch

    while ((linkMatch = linkRegex.exec(html)) !== null && videos.length < 40) {
      const href = linkMatch[1]
      const title = linkMatch[2]
      const videoId = extractVideoId(href)
      if (!videoId || !title) continue

      // Don't add duplicates
      if (videos.some(v => v.videoId === videoId)) continue

      // Try to find thumbnail near this link
        // Keep thumbnail lookup inside the current result so neighboring cards cannot leak images.
        const itemStart = html.lastIndexOf('<div id="video_', linkMatch.index)
        const nearbyStart = itemStart >= 0 ? itemStart : Math.max(0, linkMatch.index - 2500)
        const nearby = html.slice(nearbyStart, Math.min(html.length, linkMatch.index + 500))

      let thumbnail: string | null = null
      let preview: string | null = null
      // Look for data-src or src with an image URL
      const thumbMatch = nearby.match(/(?:data-src|src)="(https?:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/)
         if (thumbMatch && !thumbMatch[1].includes('THUMBNUM')) {
        thumbnail = thumbMatch[1]
        } else {
          const sfwThumbMatch = nearby.match(/data-sfwthumb="(https?:\/\/[^\"]+)"/)
          const mozaiqueMatch = nearby.match(/data-mzl="(https?:\/\/[^\"]+)"/)
          thumbnail = sfwThumbMatch?.[1] || mozaiqueMatch?.[1] || null
      }
        const previewMatch = nearby.match(/data-pvv="(https?:\/\/[^\"]+)"/)
        preview = previewMatch ? previewMatch[1] : null

      // Look for duration
      let duration: string | null = null
      const durMatch = nearby.match(/<span\s+class="duration"[^>]*>([^<]+)<\/span>/)
      if (durMatch) {
        duration = durMatch[1].trim()
      }

      videos.push({
        videoId,
        title,
        duration,
        views: null,
        siteUrl: `https://www.xvideos.com${href}`,
        site: 'xvideos',
        hash: createHash('xvideos', videoId),
        thumbnail,
        preview,
      })
    }

    // If regex approach failed, try a different pattern
    if (videos.length === 0) {
      // Look for JSON data in script tags
      const jsonMatch = html.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1])
          for (const v of parsed.slice(0, 40)) {
            const videoId = v.id || extractVideoId(v.url || '')
            if (!videoId) continue
            videos.push({
              videoId,
              title: v.title || 'Untitled',
              duration: v.duration || null,
              views: v.views || null,
              siteUrl: v.url || `https://www.xvideos.com/video${videoId}`,
              site: 'xvideos',
              hash: createHash('xvideos', videoId),
              thumbnail: v.thumbnail || v.img || null,
              preview: v.preview || v.previewUrl || null,
            })
          }
        } catch { /* ignore parse errors */ }
      }
    }

    return NextResponse.json(curateResults(videos, normalizedQuery))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Search failed', details: message },
      { status: 500 }
    )
  }
}
