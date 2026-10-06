import { NextResponse } from 'next/server'

const NIM_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
// These text models were verified in NVIDIA's current /v1/models catalog.
// NVIDIA currently describes hosted NIM model APIs as having a free trial tier.
const DEFAULT_MODELS = [
  'openai/gpt-oss-20b',
  'deepseek-ai/deepseek-v4.1-flash',
  'z-ai/glm-5.3-flash',
  'nvidia/llama-3.1-nemotron-70b-instruct',
]
const MAX_PROMPT_LENGTH = 140
const MODEL_TIMEOUT_MS = 35_000
const TOTAL_MODEL_TIMEOUT_MS = 65_000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 8
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const ALLOWED_ICONS = new Set([
  'fire', 'heart', 'lips', 'body', 'globe', 'sparkle', 'hand', 'bolt',
  'water', 'hair', 'video', 'eye', 'users',
])
const AGE_RELATED_TERMS = /\b(?:minor|underage|child|children|teen|teens|teenager|schoolgirl|schoolboy|loli|ageplay)\b/i
let nextModelIndex = 0

function getModels(): string[] {
  const configured = process.env.NVIDIA_NIM_MODELS
    ?.split(',')
    .map((model) => model.trim())
    .filter((model) => /^[a-z0-9][a-z0-9/._-]{2,119}$/i.test(model))
  return [...new Set(configured?.length ? configured : DEFAULT_MODELS)].slice(0, 8)
}

function cleanName(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[<>\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28)
}

function cleanQuery(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 4)
    .join(' ')
}

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'local'
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now()
  const current = rateLimits.get(clientKey)
  if (!current || current.resetAt <= now) {
    rateLimits.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > RATE_LIMIT_MAX
}

function extractJson(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Missing JSON object')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function normalizeNiches(value: unknown): Array<{ id: string; name: string; icon: string }> {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { niches?: unknown }).niches)) return []
  const seen = new Set<string>()
  return ((value as { niches: unknown[] }).niches)
    .slice(0, 12)
    .flatMap((item): Array<{ id: string; name: string; icon: string }> => {
      if (!item || typeof item !== 'object') return []
      const candidate = item as { name?: unknown; query?: unknown; icon?: unknown }
      const name = cleanName(candidate.name)
      const query = cleanQuery(candidate.query || candidate.name)
      if (!name || !query || AGE_RELATED_TERMS.test(`${name} ${query}`) || seen.has(query)) return []
      seen.add(query)
      const icon = typeof candidate.icon === 'string' && ALLOWED_ICONS.has(candidate.icon)
        ? candidate.icon
        : 'sparkle'
      return [{ id: query, name, icon }]
    })
    .slice(0, 8)
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request)
  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: 'Too many niche requests. Please try again in a few minutes.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const payload = body && typeof body === 'object'
    ? body as { prompt?: unknown; existingNiches?: unknown }
    : {}
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : ''
  if (!prompt) {
    return NextResponse.json({ error: 'Enter a mood or theme to generate niches.' }, { status: 400 })
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Keep the theme to ${MAX_PROMPT_LENGTH} characters or fewer.` },
      { status: 400 }
    )
  }
  if (AGE_RELATED_TERMS.test(prompt)) {
    return NextResponse.json(
      { error: 'Use adult-only themes without age-related terms.' },
      { status: 400 }
    )
  }

  const apiKey = process.env.NVIDIA_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NVIDIA NIM niche generation is not configured on the server.' },
      { status: 503 }
    )
  }

  const existingNiches = Array.isArray(payload.existingNiches)
    ? payload.existingNiches
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 40)
        .map((item) => item.slice(0, 32))
    : []
  const models = getModels()
  if (models.length === 0) {
    return NextResponse.json({ error: 'No NVIDIA NIM models are configured.' }, { status: 503 })
  }

  let rateLimitedCount = 0
  let notFoundCount = 0
  let serverErrorCount = 0
  let timeoutCount = 0
  let retryAfter: string | null = null
  const startIndex = nextModelIndex % models.length
  const deadline = Date.now() + TOTAL_MODEL_TIMEOUT_MS

  for (let attempt = 0; attempt < models.length; attempt += 1) {
    const remainingMs = deadline - Date.now()
    if (remainingMs <= 0) break
    const modelIndex = (startIndex + attempt) % models.length
    const model = models[modelIndex]
    let upstream: Response

    try {
      upstream = await fetch(NIM_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 650,
          messages: [
            {
              role: 'system',
              content: [
                'You create concise discovery categories for an adults-only, consent-first co-viewing app.',
                'Suggest exactly 6 distinct, non-graphic niche labels and short RedGifs search queries based on the user theme.',
                'Use only adult, non-age-coded themes; do not include minors, age-play, coercion, exploitation, or violence.',
                'Keep labels friendly and brief. Queries must be 1-4 lowercase English words, suitable as direct tag searches.',
                'Choose one icon per item from: fire, heart, lips, body, globe, sparkle, hand, bolt, water, hair, video, eye, users.',
                'Return one JSON object only, in exactly this shape: {"niches":[{"name":"...","query":"...","icon":"sparkle"}]}.',
              ].join(' '),
            },
            {
              role: 'user',
              content: `Theme: ${prompt}\nExisting labels to avoid repeating: ${existingNiches.join(', ') || 'none'}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(Math.min(MODEL_TIMEOUT_MS, remainingMs)),
      })
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError'
      nextModelIndex = (modelIndex + 1) % models.length
      if (isTimeout) {
        timeoutCount += 1
        continue
      }
      console.error('[generate-niches] NVIDIA NIM request failed.')
      return NextResponse.json(
        { error: 'Could not reach NVIDIA NIM right now.' },
        { status: 502 }
      )
    }

    if (upstream.status === 429) {
      rateLimitedCount += 1
      retryAfter = upstream.headers.get('retry-after') || retryAfter
      nextModelIndex = (modelIndex + 1) % models.length
      continue
    }

    // NVIDIA may list a model even when its hosted function is not mapped to this account.
    // Skip that model and try another rather than failing the whole generation request.
    if (upstream.status === 404) {
      notFoundCount += 1
      nextModelIndex = (modelIndex + 1) % models.length
      continue
    }

    if (upstream.status === 502 || upstream.status === 503 || upstream.status === 504) {
      serverErrorCount += 1
      nextModelIndex = (modelIndex + 1) % models.length
      continue
    }

    if (!upstream.ok) {
      const message = upstream.status === 401 || upstream.status === 403
        ? 'NVIDIA rejected the configured API key.'
        : `NVIDIA NIM generation failed (HTTP ${upstream.status}).`
      return NextResponse.json({ error: message }, { status: 502 })
    }

    let response: { choices?: Array<{ message?: { content?: unknown } }> }
    try {
      response = await upstream.json()
    } catch {
      return NextResponse.json({ error: 'NVIDIA NIM returned an unexpected response.' }, { status: 502 })
    }
    const content = response.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'NVIDIA NIM returned an unexpected response.' }, { status: 502 })
    }

    let generated: unknown
    try {
      generated = extractJson(content)
    } catch {
      return NextResponse.json({ error: 'NVIDIA NIM returned an invalid niche format.' }, { status: 502 })
    }
    const niches = normalizeNiches(generated)
    if (niches.length < 3) {
      return NextResponse.json({ error: 'NVIDIA NIM returned too few usable niche ideas. Try another theme.' }, { status: 502 })
    }

    nextModelIndex = (modelIndex + 1) % models.length
    return NextResponse.json({ niches, provider: 'nvidia-nim', model })
  }

  if (rateLimitedCount > 0) {
    const headers = retryAfter && /^\d{1,5}$/.test(retryAfter) ? { 'Retry-After': retryAfter } : undefined
    return NextResponse.json(
      { error: 'NVIDIA NIM rate-limited every configured model. Please try again shortly.' },
      { status: 429, headers }
    )
  }
  if (notFoundCount === models.length) {
    return NextResponse.json(
      { error: 'NVIDIA lists the models, but hosted inference endpoints were not found for this account. Check NVIDIA NIM API access.' },
      { status: 503 }
    )
  }
  if (serverErrorCount === models.length) {
    return NextResponse.json(
      { error: 'All configured NVIDIA NIM models are temporarily unavailable. Please retry shortly.' },
      { status: 503 }
    )
  }
  if (timeoutCount > 0) {
    return NextResponse.json(
      { error: 'No configured NVIDIA NIM model responded before the timeout. Please retry shortly.' },
      { status: 504 }
    )
  }

  return NextResponse.json({ error: 'Could not generate niches with the configured NVIDIA NIM models.' }, { status: 502 })
}
