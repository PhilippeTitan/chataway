import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return new Response('URL required', { status: 400 })
  }

  // Validate URL
  let urlObj: URL
  try {
    urlObj = new URL(url)
  } catch {
    return new Response('Invalid URL', { status: 400 })
  }

  // Block local/private IPs
  const hostname = urlObj.hostname
  if (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.includes('localhost')
  ) {
    return new Response('Private URL blocked', { status: 403 })
  }

  // Forward range requests for video seeking
  const range = request.headers.get('range')
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  }

  // Set referer based on the CDN host
  if (hostname.includes('xvideos') || hostname.includes('cdn-xvideos')) {
    headers['Referer'] = 'https://www.xvideos.com/'
    headers['Origin'] = 'https://www.xvideos.com'
  } else if (hostname.includes('pornhub') || hostname.includes('phncdn')) {
    headers['Referer'] = 'https://www.pornhub.com/'
    headers['Origin'] = 'https://www.pornhub.com'
  } else if (hostname.includes('xhamster') || hostname.includes('xhcdn')) {
    headers['Referer'] = 'https://www.xhamster.com/'
    headers['Origin'] = 'https://www.xhamster.com'
  } else if (hostname.includes('xnxx')) {
    headers['Referer'] = 'https://www.xnxx.com/'
    headers['Origin'] = 'https://www.xnxx.com'
  }

  if (range) {
    headers['Range'] = range
  }

  try {
    const response = await fetch(url, { headers })

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
  } catch {
    return new Response('Proxy failed', { status: 500 })
  }
}
