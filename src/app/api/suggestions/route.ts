import { NextResponse } from 'next/server'

interface CuratedIntent {
  term: string
  variants: string[]
}

const CURATED_INTENTS: CuratedIntent[] = [
  {
    term: 'squirting',
    variants: ['orgasm', 'compilation', 'pov', 'solo', 'homemade'],
  },
]

const QUERY_ALIASES: Record<string, string> = {
  squrting: 'squirting',
  squirtting: 'squirting',
}

function resolveCuratedQuery(query: string): { corrected: string; variants: string[] } | null {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const intentIndex = terms.findIndex(term => {
    const normalized = QUERY_ALIASES[term] || term
    return CURATED_INTENTS.some(intent => intent.term.startsWith(normalized) && normalized.length >= 3)
  })

  if (intentIndex < 0) return null

  const typedTerm = terms[intentIndex]
  const intent = CURATED_INTENTS.find(candidate => {
    const normalized = QUERY_ALIASES[typedTerm] || typedTerm
    return candidate.term.startsWith(normalized) && normalized.length >= 3
  })!
  const correctedTerms = [...terms]
  correctedTerms[intentIndex] = intent.term
  const corrected = correctedTerms.join(' ')

  return {
    corrected,
    variants: intent.variants.map(variant => `${corrected} ${variant}`),
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''

  try {
    let suggestions: { text: string; type: string }[] = []

    if (q.length > 0) {
      const curated: Record<string, string[]> = {
        squirting: ['squirting orgasm', 'female squirting', 'squirting compilation', 'squirting pov', 'squirting homemade', 'squirting solo'],
      }
      const curatedQuery = resolveCuratedQuery(q)
      const related = curatedQuery
        ? curatedQuery.variants
        : curated[q.toLowerCase()] || [
          `${q} amateur`, `${q} homemade`, `${q} compilation`,
          `${q} solo`, `${q} pov`, `${q} orgasm`, `${q} mature`,
        ]
      suggestions = [curatedQuery?.corrected || q, ...related]
        .filter((text, index, all) => all.indexOf(text) === index)
        .slice(0, 8)
        .map((text, index) => ({ text, type: index === 0 ? 'query' : 'suggestion' }))
    } else {
      // Trending/default suggestions
      const trending = [
        { text: 'amateur', type: 'trending' },
        { text: 'homemade', type: 'trending' },
        { text: 'teen', type: 'trending' },
        { text: 'milf', type: 'trending' },
        { text: 'lesbian', type: 'trending' },
        { text: 'anal', type: 'trending' },
        { text: 'blowjob', type: 'trending' },
        { text: 'threesome', type: 'trending' },
        { text: 'big ass', type: 'trending' },
        { text: 'creampie', type: 'trending' },
      ]
      suggestions = trending
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    return NextResponse.json({ suggestions: [], error: String(error) })
  }
}
