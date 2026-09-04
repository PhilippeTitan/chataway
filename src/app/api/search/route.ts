import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'amateur'
  const page = searchParams.get('page') || '1'
  const sort = searchParams.get('sort') || 'relevance'
  const site = searchParams.get('site') || 'all'

  try {
    // For now, only xvideos_search.py exists
    // In the future, we can add scripts for other sites
    if (site === 'all' || site === 'xvideos') {
      const { stdout } = await execFileAsync(
        'python3',
        ['scripts/xvideos_search.py', query, page, sort],
        { timeout: 30000 }
      )

      const videos = JSON.parse(stdout)
      return NextResponse.json(videos)
    }

    // For other sites, return empty for now
    return NextResponse.json([])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Search failed', details: message },
      { status: 500 }
    )
  }
}
