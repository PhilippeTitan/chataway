import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// In-memory cache for extracted URLs (5 min TTL)
const streamCache = new Map<string, { url: string; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000

function getCachedUrl(hash: string): string | null {
  const cached = streamCache.get(hash)
  if (cached && cached.expires > Date.now()) {
    return cached.url
  }
  streamCache.delete(hash)
  return null
}

function setCachedUrl(hash: string, url: string): void {
  streamCache.set(hash, { url, expires: Date.now() + CACHE_TTL })
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const hash = request.nextUrl.searchParams.get('hash')

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  // Check cache first
  if (hash) {
    const cached = getCachedUrl(hash)
    if (cached) {
      return NextResponse.json({ streamUrl: cached, cached: true })
    }
  }

  // Validate URL is from allowed sites
  const allowedSites = ['xvideos.com', 'pornhub.com', 'xhamster.com', 'xnxx.com']
  try {
    const urlObj = new URL(url)
    if (!allowedSites.some(site => urlObj.hostname.includes(site))) {
      return NextResponse.json({ error: 'Site not allowed' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const { stdout } = await execFileAsync(
      'python3',
      ['scripts/extract_url.py', url],
      { timeout: 60000 }
    )

    const info = JSON.parse(stdout)

    if (info.error) {
      return NextResponse.json({ error: info.error }, { status: 500 })
    }

    // Cache the result
    if (info.streamUrl && hash) {
      setCachedUrl(hash, info.streamUrl)
    }

    return NextResponse.json(info)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Extraction failed', details: message },
      { status: 500 }
    )
  }
}
