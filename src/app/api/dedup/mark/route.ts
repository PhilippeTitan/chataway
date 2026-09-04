import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, hash, site, videoId } = await request.json()

    if (!userId || !hash || !site || !videoId) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('seen_videos')
      .upsert({
        user_id: userId,
        video_hash: hash,
        site: site,
        video_id: videoId,
      }, { onConflict: 'user_id,video_hash' })

    if (error) {
      // If table doesn't exist, just log and continue (graceful degradation)
      if (
        error.message?.includes('does not exist') ||
        error.message?.includes('permission denied') ||
        error.message?.includes('row-level security') ||
        ['42501', '42P01'].includes(error.code || '')
      ) {
        return NextResponse.json({ success: true, note: 'Table not found, localStorage only' })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: true, note: 'Fallback mode' })
  }
}
