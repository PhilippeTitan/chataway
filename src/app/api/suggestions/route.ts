import { NextResponse } from 'next/server'

interface AutocompleteIntent {
  term: string
  aliases: string[]
  completions: string[]
}

const AUTOCOMPLETE_INTENTS: AutocompleteIntent[] = [
  {
    term: 'ebony',
    aliases: ['ebondy'],
    completions: [
      'squirting', 'compilation', 'solo', 'pov', 'homemade', 'interracial',
      'amateur', 'anal', 'oral', 'creampie', 'milf', 'mature', 'lesbian',
      'threesome', 'public', 'roleplay', 'cosplay', 'deepthroat', 'rough', 'romantic',
    ],
  },
  {
    term: 'squirting',
    aliases: ['squrting', 'squirtting', 'squi', 'sq'],
    completions: [
      'compilation', 'solo', 'pov', 'homemade', 'amateur', 'squirt show',
      'multiple orgasms', 'first time', 'public', 'facial', 'creampie', 'milf',
      'mature', 'interracial', 'lesbian', 'threesome', 'orgasm', 'close up', 'cumshot',
    ],
  },
  {
    term: 'latina',
    aliases: ['lati', 'latin'],
    completions: [
      'compilation', 'fucked', 'solo', 'pov', 'homemade', 'amateur', 'milf',
      'mature', 'interracial', 'lesbian', 'threesome', 'anal', 'oral', 'public',
      'creampie', 'deepthroat', 'rough', 'romantic', 'first time',
    ],
  },
]

function findIntent(term: string): AutocompleteIntent | null {
  const normalized = term.toLowerCase()
  return AUTOCOMPLETE_INTENTS.find(intent =>
    intent.term.startsWith(normalized) ||
    intent.aliases.some(alias => alias.startsWith(normalized) || normalized.startsWith(alias))
  ) || null
}

function getIntentCompletions(query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const intentIndex = terms.findIndex(term => findIntent(term) !== null)
  if (intentIndex < 0) return []

  const intent = findIntent(terms[intentIndex])!
  const correctedTerms = terms.map(term => findIntent(term)?.term || term)
  const corrected = correctedTerms.join(' ')

  return [corrected, ...intent.completions
    .filter(completion => !correctedTerms.includes(completion))
    .map(completion => `${corrected} ${completion}`)]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''

  try {
    let suggestions: { text: string; type: string }[] = []

    if (q.length > 0) {
      const completions = getIntentCompletions(q)
      suggestions = [q, ...completions]
        .filter((text, index, all) => all.indexOf(text) === index)
        .slice(0, 30)
        .map((text, index) => ({ text, type: index === 0 ? 'query' : 'completion' }))
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
