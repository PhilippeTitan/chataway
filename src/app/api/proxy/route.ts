import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return new Response('URL required', { status: 400 })
  }

  // Validate URL is from allowed CDN domains
  const allowedDomains = [
    'phncdn.com',
    'ci.phncdn.com',
    'hw.phncdn.com',
    'pornhub.com',
    'xvideos.com',
    'xhamster.com',
  ]

  try {
    const urlObj = new URL(url)
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return new Response('Domain not allowed', { status: 403 })
    }
  } catch {
    return new Response('Invalid URL', { status: 400 })
  }

  // Forward range requests for video seeking
  const range = request.headers.get('range')
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.xvideos.com/',
    'Origin': 'https://www.xvideos.com',
  }

  if (range) {
    headers['Range'] = range
  }

  try {
    const response = await fetch(url, { headers })

    // Stream the response back with CORS headers
    const newHeaders = new Headers()
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Content-Type', response.headers.get('Content-Type') || 'video/mp4')

    if (response.headers.get('Content-Length')) {
      newHeaders.set('Content-Length', response.headers.get('Content-Length')!)
    }
    if (response.headers.get('Content-Range')) {
      newHeaders.set('Content-Range', response.headers.get('Content-Range')!)
    }
    if (response.headers.get('Accept-Ranges')) {
      newHeaders.set('Accept-Ranges', response.headers.get('Accept-Ranges')!)
    }

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    })
  } catch (error) {
    return new Response('Proxy failed', { status: 500 })
  }
}
