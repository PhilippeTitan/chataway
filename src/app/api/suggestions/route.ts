import { NextResponse } from 'next/server'

const QUERY_ALIASES: Record<string, string> = {
  squrting: 'squirting',
  squirtting: 'squirting',
  ebondy: 'ebony',
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'at', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'with',
  'video', 'videos', 'hd', 'official', 'new', 'see', 'has',
  'must', 'just', 'gma', 'part', 'full',
])

function isSuggestionTerm(term: string): boolean {
  return term.length > 2 && /^[a-z]+$/.test(term) && !STOP_WORDS.has(term)
}

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(term => QUERY_ALIASES[term] || term)
    .join(' ')
}

function decodeTitle(title: string): string {
  return title
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitles(html: string): string[] {
  const titles: string[] = []
  const linkRegex = /<a\s+[^>]*href="\/video[./][a-zA-Z0-9]+\/[^\"]+"[^>]*title="([^"]*)"[^>]*>/g
  let match

  while ((match = linkRegex.exec(html)) !== null && titles.length < 40) {
    const title = decodeTitle(match[1])
    if (title && !titles.includes(title)) titles.push(title)
  }
  return titles
}

function rankCandidates(query: string, titles: string[]): string[] {
  const normalizedQuery = normalizeQuery(query)
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean)
  const candidates = new Map<string, number>()
  const matchingTitles: { titleTerms: string[]; matchedPositions: number[]; canonicalQuery: string }[] = []

  for (const title of titles) {
    const titleTerms = normalizeQuery(title).split(/\s+/).filter(Boolean)
    const matchedPositions = queryTerms.map(queryTerm => titleTerms.findIndex(titleTerm =>
      titleTerm === queryTerm || titleTerm.startsWith(queryTerm)
    ))
    if (matchedPositions.some(position => position < 0)) continue

    const canonicalTerms = queryTerms.map((queryTerm, index) => {
      const matchedTerm = titleTerms[matchedPositions[index]]
      return matchedTerm || queryTerm
    })
    const canonicalQuery = canonicalTerms.join(' ')
    matchingTitles.push({ titleTerms, matchedPositions, canonicalQuery })
  }

  const extraFrequency = new Map<string, number>()
  for (const { titleTerms, matchedPositions } of matchingTitles) {
    const queryPositionSet = new Set(matchedPositions)
    const uniqueExtras = new Set(titleTerms.filter((term, index) =>
      !queryPositionSet.has(index) && isSuggestionTerm(term)
    ))
    for (const term of uniqueExtras) extraFrequency.set(term, (extraFrequency.get(term) || 0) + 1)
  }

  const minimumFrequency = matchingTitles.length > 8 ? 2 : 1
  for (const { canonicalQuery } of matchingTitles) {
    candidates.set(canonicalQuery, (candidates.get(canonicalQuery) || 0) + 100)
  }

  for (const { canonicalQuery } of matchingTitles) {
    for (const [extraTerm, frequency] of extraFrequency) {
      if (frequency < minimumFrequency) continue
      const candidate = `${canonicalQuery} ${extraTerm}`
      candidates.set(candidate, (candidates.get(candidate) || 0) + frequency * 10)
    }
  }

  return [...candidates.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].length - second[0].length)
    .map(([candidate]) => candidate)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''

  if (!query) return NextResponse.json({ suggestions: [] })

  try {
    const url = new URL('https://www.xvideos.com/')
    url.searchParams.set('k', normalizeQuery(query))
    url.searchParams.set('p', '1')

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return NextResponse.json({ suggestions: [{ text: query, type: 'query' }] })

    const completions = rankCandidates(query, extractTitles(await response.text()))
    const suggestions = [query, ...completions]
      .filter((text, index, all) => all.indexOf(text) === index)
      .slice(0, 30)
      .map((text, index) => ({ text, type: index === 0 ? 'query' : 'completion' }))

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: [{ text: query, type: 'query' }] })
  }
}
