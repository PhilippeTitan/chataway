import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

const execFileAsync = promisify(execFile)
const REDGIFS_CACHE_TTL_MS = 120_000
const redgifsCache = new Map<string, { expiresAt: number; value: unknown }>()
const pendingRedgifsRequests = new Map<string, Promise<unknown>>()

function getPythonExecutable(): string {
  if (process.platform === 'win32') {
    const venvPython = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
    return require('fs').existsSync(venvPython) ? venvPython : 'py'
  }
  return 'python3'
}

function getCacheKey(action: string, query: string, count: string, page: string) {
  return `${action}|${query.toLowerCase()}|${count}|${page}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('q') || 'trending'
  const action = searchParams.get('action') || 'search'
  const count = searchParams.get('count') || '12'
  const page = searchParams.get('page') || '1'

  // Parse positive vs negative exclusion terms ([Q176])
  const parts = rawQuery.trim().split(/\s+/)
  const positive: string[] = []
  const negative: string[] = []
  for (const part of parts) {
    if (part.startsWith('-') && part.length > 1) {
      negative.push(part.slice(1).toLowerCase().replace(/[^a-z0-9]+/g, ''))
    } else {
      const clean = part.toLowerCase().replace(/[^a-z0-9]+/g, '')
      if (clean) positive.push(clean)
    }
  }

  const query = positive.length > 0 ? positive.join(' ') : 'trending'
  const cacheKey = getCacheKey(action, `${query}_neg_${negative.join('_')}`, count, page)
  const cached = redgifsCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value)
  }

  if (cached) {
    redgifsCache.delete(cacheKey)
  }

  const pending = pendingRedgifsRequests.get(cacheKey)
  if (pending) {
    return NextResponse.json(await pending)
  }

  const pythonCommand = getPythonExecutable()
  const pythonArgs = ['scripts/redgifs_search.py', action, query, count, page]

  const requestPromise = (async () => {
    try {
      const { stdout, stderr } = await execFileAsync(pythonCommand, pythonArgs, {
        timeout: 30000,
        env: { ...process.env },
      })

      if (stderr && !stdout) {
        return { error: stderr.slice(0, 500) }
      }

      let results = JSON.parse(stdout)
      if (Array.isArray(results) && negative.length > 0) {
        results = results.filter((item: Record<string, unknown>) => {
          const title = String(item.title || '').toLowerCase()
          const tags = Array.isArray(item.tags) ? item.tags.map(String).join(' ').toLowerCase() : ''
          return !negative.some(neg => title.includes(neg) || tags.includes(neg))
        })
      }

      if (results.length === 1 && results[0]?.error) {
        console.warn('[redgifs] script reported dependency issue:', results[0].error)
        const fallback: unknown[] = []
        redgifsCache.set(cacheKey, { expiresAt: Date.now() + REDGIFS_CACHE_TTL_MS, value: fallback })
        return fallback
      }

      redgifsCache.set(cacheKey, {
        expiresAt: Date.now() + REDGIFS_CACHE_TTL_MS,
        value: results,
      })

      return results
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[redgifs] failed:', message)
      return []
    } finally {
      pendingRedgifsRequests.delete(cacheKey)
    }
  })()

  pendingRedgifsRequests.set(cacheKey, requestPromise)

  const value = await requestPromise
  return NextResponse.json(value)
}
