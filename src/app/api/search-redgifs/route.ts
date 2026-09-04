import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'trending'
  const action = searchParams.get('action') || 'search' // search | trending | niche
  const count = searchParams.get('count') || '30'
  const page = searchParams.get('page') || '1'

  const args = ['scripts/redgifs_search.py', action, query, count, page]

  try {
    const { stdout, stderr } = await execFileAsync('python3', args, {
      timeout: 30000,
      env: { ...process.env },
    })

    if (stderr && !stdout) {
      return NextResponse.json({ error: stderr.slice(0, 500) }, { status: 500 })
    }

    const results = JSON.parse(stdout)

    if (results.length === 1 && results[0]?.error) {
      return NextResponse.json({ error: results[0].error }, { status: 502 })
    }

    return NextResponse.json(results)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'RedGifs search failed', details: message },
      { status: 500 }
    )
  }
}
