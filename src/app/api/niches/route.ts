import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function GET() {
  try {
    const { stdout, stderr } = await execFileAsync('python3', [
      'scripts/redgifs_search.py', 'niches',
    ], {
      timeout: 15000,
      env: { ...process.env },
    })

    if (stderr && !stdout) {
      return NextResponse.json({ error: stderr.slice(0, 500) }, { status: 500 })
    }

    const niches = JSON.parse(stdout)
    return NextResponse.json(niches)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to load niches', details: message },
      { status: 500 }
    )
  }
}
