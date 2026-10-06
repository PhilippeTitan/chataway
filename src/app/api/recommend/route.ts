import { NextResponse } from 'next/server'
import * as crypto from 'crypto'

function createHash(site: string, videoId: string): string {
  return crypto.createHash('sha256').update(`${site}_${videoId}`).digest('hex').slice(0, 16)
}

function extractVideoId(href: string): string | null {
  const match = href.match(/\/video[./]([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

/**
 * Fetches related/recommended videos for a given video URL.
 * Falls back to search-based recommendations if page scraping fails.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoUrl = searchParams.get('url')
  const title = searchParams.get('title') || ''
  const count = parseInt(searchParams.get('count') || '20', 10)

  if (!videoUrl) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    // Strategy 1: Scrape the video page for related videos
    const related = await scrapeRelatedVideos(videoUrl, count)
    if (related.length >= 4) {
      return NextResponse.json(related)
    }

    // Strategy 2: Fallback — use title keywords to search for similar content
    const keywords = extractKeywords(title)
    if (keywords) {
      const searchRelated = await searchRelatedVideos(keywords, count)
      // Merge, deduplicate
      const merged = deduplicateVideos([...related, ...searchRelated]).slice(0, count)
      return NextResponse.json(merged)
    }

    return NextResponse.json(related)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[recommend] error:', message)
    return NextResponse.json([], { status: 200 }) // Return empty array gracefully
  }
}

async function scrapeRelatedVideos(videoUrl: string, count: number) {
  const resp = await fetch(videoUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!resp.ok) return []

  const html = await resp.text()
  const videos: Record<string, unknown>[] = []

  // XVideos related video pattern — thumb-blocks in the related section
  const linkRegex =
    /<a\s+[^>]*href="(\/video[./][a-zA-Z0-9]+\/[^"]+)"[^>]*title="([^"]*)"[^>]*>/g
  let linkMatch

  while ((linkMatch = linkRegex.exec(html)) !== null && videos.length < count) {
    const href = linkMatch[1]
    const matchedTitle = linkMatch[2]
    const videoId = extractVideoId(href)
    if (!videoId || !matchedTitle) continue
    if (videos.some((v) => v.videoId === videoId)) continue

    // Scope thumbnail search to nearby HTML
    const itemStart = html.lastIndexOf('<div id="video_', linkMatch.index)
    const nearbyStart = itemStart >= 0 ? itemStart : Math.max(0, linkMatch.index - 2500)
    const nearby = html.slice(nearbyStart, Math.min(html.length, linkMatch.index + 500))

    let thumbnail: string | null = null
    let preview: string | null = null

    const thumbMatch = nearby.match(
      /(?:data-src|src)="(https?:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/
    )
    if (thumbMatch && !thumbMatch[1].includes('THUMBNUM')) {
      thumbnail = thumbMatch[1]
    } else {
      const sfwThumbMatch = nearby.match(/data-sfwthumb="(https?:\/\/[^"]+)"/)
      const mozaiqueMatch = nearby.match(/data-mzl="(https?:\/\/[^"]+)"/)
      thumbnail = sfwThumbMatch?.[1] || mozaiqueMatch?.[1] || null
    }
    const previewMatch = nearby.match(/data-pvv="(https?:\/\/[^"]+)"/)
    preview = previewMatch ? previewMatch[1] : null

    let duration: string | null = null
    const durMatch = nearby.match(/<span\s+class="duration"[^>]*>([^<]+)<\/span>/)
    if (durMatch) duration = durMatch[1].trim()

    videos.push({
      videoId,
      title: matchedTitle,
      duration,
      views: null,
      siteUrl: `https://www.xvideos.com${href}`,
      site: 'xvideos',
      hash: createHash('xvideos', videoId),
      thumbnail,
      preview,
    })
  }

  return videos
}

async function searchRelatedVideos(query: string, count: number) {
  const url = new URL('https://www.xvideos.com/')
  url.searchParams.set('k', query)
  url.searchParams.set('p', '1')

  const resp = await fetch(url.toString(), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!resp.ok) return []

  const html = await resp.text()
  const videos: Record<string, unknown>[] = []

  const linkRegex =
    /<a\s+[^>]*href="(\/video[./][a-zA-Z0-9]+\/[^"]+)"[^>]*title="([^"]*)"[^>]*>/g
  let linkMatch

  while ((linkMatch = linkRegex.exec(html)) !== null && videos.length < count) {
    const href = linkMatch[1]
    const title = linkMatch[2]
    const videoId = extractVideoId(href)
    if (!videoId || !title) continue
    if (videos.some((v) => v.videoId === videoId)) continue

    const itemStart = html.lastIndexOf('<div id="video_', linkMatch.index)
    const nearbyStart = itemStart >= 0 ? itemStart : Math.max(0, linkMatch.index - 2500)
    const nearby = html.slice(nearbyStart, Math.min(html.length, linkMatch.index + 500))

    let thumbnail: string | null = null
    let preview: string | null = null

    const thumbMatch = nearby.match(
      /(?:data-src|src)="(https?:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/
    )
    if (thumbMatch && !thumbMatch[1].includes('THUMBNUM')) {
      thumbnail = thumbMatch[1]
    } else {
      const sfwThumbMatch = nearby.match(/data-sfwthumb="(https?:\/\/[^"]+)"/)
      const mozaiqueMatch = nearby.match(/data-mzl="(https?:\/\/[^"]+)"/)
      thumbnail = sfwThumbMatch?.[1] || mozaiqueMatch?.[1] || null
    }
    const previewMatch = nearby.match(/data-pvv="(https?:\/\/[^"]+)"/)
    preview = previewMatch ? previewMatch[1] : null

    let duration: string | null = null
    const durMatch = nearby.match(/<span\s+class="duration"[^>]*>([^<]+)<\/span>/)
    if (durMatch) duration = durMatch[1].trim()

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

  return videos
}

function extractKeywords(title: string): string {
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'and', 'or',
    'is', 'are', 'was', 'her', 'his', 'she', 'he', 'this', 'that', 'it', 'by',
    'from', 'up', 'out', 'if', 'about', 'who', 'get', 'has', 'been', 'very',
    'video', 'full', 'hd', 'new', 'hot', 'best', 'big', 'huge', 'free',
  ])

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 3)
    .join(' ')
}

function deduplicateVideos(videos: Record<string, unknown>[]) {
  const seen = new Set<string>()
  return videos.filter((v) => {
    const id = String(v.videoId || v.hash)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}
