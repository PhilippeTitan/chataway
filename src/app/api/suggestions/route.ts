import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''

  try {
    let suggestions: { text: string; type: string }[] = []

    if (q.length > 0) {
      const curated: Record<string, string[]> = {
        squirting: ['squirting orgasm', 'female squirting', 'squirting compilation', 'squirting pov', 'squirting homemade', 'squirting solo'],
      }
      const related = curated[q.toLowerCase()] || [
        `${q} amateur`, `${q} homemade`, `${q} compilation`,
        `${q} solo`, `${q} pov`, `${q} orgasm`, `${q} mature`,
      ]
      suggestions = [q, ...related]
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
