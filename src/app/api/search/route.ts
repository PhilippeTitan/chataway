import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'amateur'
  const page = searchParams.get('page') || '1'

  try {
    const res = await fetch(
      `https://www.pornhub.com/webmasters/search?search=${encodeURIComponent(query)}&page=${page}`,
      { headers: { 'User-Agent': 'CHATAway/1.0' } }
    )
    
    if (!res.ok) throw new Error(`API ${res.status}`)
    
    const data = await res.json()
    
    const videos = (data.videos || []).map((v: Record<string, unknown>) => ({
      title: v.title,
      videoId: v.video_id,
      url: v.url,
      thumbnail: v.default_thumb || v.thumb,
      duration: v.duration,
      views: typeof v.views === 'number' ? v.views.toLocaleString() : v.views,
      rating: v.rating ? `${Math.round(v.rating)}%` : null,
    }))
    
    return NextResponse.json(videos)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch', details: String(error) },
      { status: 500 }
    )
  }
}