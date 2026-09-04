import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

const execFileAsync = promisify(execFile)
const NICHE_CACHE_TTL_MS = 300_000
const nicheCache = new Map<string, { expiresAt: number; value: unknown }>()

function getPythonExecutable(): string {
  if (process.platform === 'win32') {
    const venvPython = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
    return require('fs').existsSync(venvPython) ? venvPython : 'py'
  }
  return 'python3'
}

export async function GET() {
  const cacheKey = 'niches'
  const cached = nicheCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value)
  }

  if (cached) {
    nicheCache.delete(cacheKey)
  }

  const pythonCommand = getPythonExecutable()
  const pythonArgs = ['scripts/redgifs_search.py', 'niches']

  try {
    const { stdout, stderr } = await execFileAsync(pythonCommand, pythonArgs, {
      timeout: 15000,
      env: { ...process.env },
    })

    if (stderr && !stdout) {
      return NextResponse.json({ error: stderr.slice(0, 500) }, { status: 500 })
    }

    const niches = JSON.parse(stdout)
    const result = Array.isArray(niches) ? niches : []
    nicheCache.set(cacheKey, { expiresAt: Date.now() + NICHE_CACHE_TTL_MS, value: result })
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[niches] failed:', message)
    const fallback = [
      { id: 'trending', name: 'Trending', icon: 'fire' },
      { id: 'amateur', name: 'Amateur', icon: 'heart' },
      { id: 'ebony', name: 'Ebony', icon: 'globe' },
      { id: 'squirting', name: 'Squirting', icon: 'water' },
    ]
    nicheCache.set(cacheKey, { expiresAt: Date.now() + NICHE_CACHE_TTL_MS, value: fallback })
    return NextResponse.json(fallback)
  }
}
