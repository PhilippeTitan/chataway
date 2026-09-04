import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { hashes } = await request.json()

    if (!hashes || !Array.isArray(hashes) || hashes.length > 100) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('seen_videos')
      .select('video_hash')
      .eq('user_id', user.id)
      .in('video_hash', hashes)

    if (error) {
      // If table doesn't exist, return empty (graceful degradation)
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ seenHashes: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const seenHashes = data?.map((d: Record<string, unknown>) => d.video_hash as string) || []
    return NextResponse.json({ seenHashes })
  } catch (err) {
    return NextResponse.json({ seenHashes: [] })
  }
}
