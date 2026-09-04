'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SearchIcon, FireIcon, ClockIcon, XIcon } from '@/components/icons'

interface Suggestion {
  text: string
  type: string
}

export interface SearchFilters {
  sortBy: 'relevance' | 'views' | 'date' | 'duration'
  site: 'all' | 'xvideos' | 'pornhub' | 'xhamster' | 'xnxx'
}

interface SearchAutocompleteProps {
  onSearch: (query: string, filters: SearchFilters) => void
  placeholder?: string
  autoFocus?: boolean
}

const HISTORY_KEY = 'chataway_search_history'
const FILTERS_KEY = 'chataway_search_filters'
const MAX_HISTORY = 8

function getHistory(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { return [] }
}

function saveToHistory(query: string) {
  const history = getHistory().filter(h => h.toLowerCase() !== query.toLowerCase())
  history.unshift(query)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

function getSavedFilters(): SearchFilters {
  if (typeof window === 'undefined') return { sortBy: 'relevance', site: 'all' }
  try {
    return JSON.parse(localStorage.getItem(FILTERS_KEY) || '{}')
  } catch { return { sortBy: 'relevance', site: 'all' } }
}

function saveFilters(filters: SearchFilters) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(filters))
}

export default function SearchAutocomplete({ onSearch, placeholder = 'Search videos...', autoFocus = false }: SearchAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [history, setHistory] = useState<string[]>(() => getHistory())
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [filters, setFilters] = useState<SearchFilters>(() => {
    const saved = getSavedFilters()
    return { sortBy: saved.sortBy || 'relevance', site: saved.site || 'all' }
  })
  const [showFilters, setShowFilters] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const fetchTimer = useRef<NodeJS.Timeout | null>(null)
  const suggestionRequest = useRef<AbortController | null>(null)

  // Fetch suggestions when query changes
  useEffect(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current)
    suggestionRequest.current?.abort()

    fetchTimer.current = setTimeout(async () => {
      const controller = new AbortController()
      suggestionRequest.current = controller
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error(err)
        }
      }
    }, 200)

    return () => {
      if (fetchTimer.current) clearTimeout(fetchTimer.current)
      suggestionRequest.current?.abort()
    }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = useCallback((text: string) => {
    setQuery(text)
    setOpen(false)
    saveToHistory(text)
    setHistory(getHistory())
    saveFilters(filters)
    onSearch(text, filters)
    inputRef.current?.blur()
  }, [onSearch, filters])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      handleSelect(query.trim())
    }
  }, [query, handleSelect])

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      saveFilters(newFilters)
      // Re-search with new filters if there's a query
      if (query.trim()) {
        onSearch(query.trim(), newFilters)
      }
      return newFilters
    })
  }, [query, onSearch])

  const getAllItems = useCallback((): Suggestion[] => {
    const items: Suggestion[] = []
    if (query.length === 0 && history.length > 0) {
      items.push(...history.slice(0, 3).map(h => ({ text: h, type: 'history' })))
    }
    items.push(...suggestions.slice(0, 30))
    return items
  }, [history, query, suggestions])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = getAllItems()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(prev => Math.min(prev + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && highlighted >= 0 && items[highlighted]) {
      e.preventDefault()
      handleSelect(items[highlighted].text)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [getAllItems, highlighted, handleSelect])

  const showDropdown = open && query.trim().length > 0

  return (
    <div className="relative" ref={dropdownRef}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            <SearchIcon className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setHighlighted(-1)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-12 pr-20 py-4 bg-[#1c130d]/90 border border-amber-900/35 rounded-xl text-white placeholder-[#8c7867] focus:outline-none focus:ring-2 focus:ring-amber-600 text-lg transition-all"
            autoFocus={autoFocus}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Filter button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                showFilters ? 'bg-amber-600/20 text-amber-300' : 'text-[#8c7867] hover:text-[#f5ebe0]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                className="text-gray-500 hover:text-white transition cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Filter Panel */}
      {showFilters && (
        <div ref={filterPanelRef} className="absolute top-full left-0 right-0 mt-2 bg-[#1c130d] rounded-xl border border-amber-900/35 shadow-2xl p-4 z-50">
          <div className="grid grid-cols-2 gap-4">
            {/* Sort By */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sort By</label>
              <div className="space-y-1">
                {[
                  { value: 'relevance', label: 'Relevance' },
                  { value: 'views', label: 'Most Viewed' },
                  { value: 'date', label: 'Newest' },
                  { value: 'duration', label: 'Duration' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleFilterChange('sortBy', opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                      filters.sortBy === opt.value
                        ? 'bg-amber-600/20 text-amber-300'
                        : 'text-[#d4c3b3] hover:bg-[#2b1d14]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Site Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Site</label>
              <div className="space-y-1">
                {[
                  { value: 'all', label: 'All Sites' },
                  { value: 'xvideos', label: 'XVideos' },
                  { value: 'pornhub', label: 'Pornhub' },
                  { value: 'xhamster', label: 'XHamster' },
                  { value: 'xnxx', label: 'XNXX' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleFilterChange('site', opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                      filters.site === opt.value
                        ? 'bg-amber-600/20 text-amber-300'
                        : 'text-[#d4c3b3] hover:bg-[#2b1d14]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c130d] rounded-xl border border-amber-900/35 shadow-2xl overflow-hidden z-50 max-h-52 overflow-y-auto">
          {/* Recent Searches */}
          {history.length > 0 && !query && (
            <div className="p-2 border-b border-gray-800">
              <div className="px-4 py-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    clearHistory()
                    setHistory([])
                  }}
                  className="text-xs text-gray-600 hover:text-gray-400 transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
              {history.slice(0, 3).map((h, i) => (
                <button
                  key={`h-${i}`}
                  onClick={() => handleSelect(h)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition cursor-pointer ${
                    highlighted === i ? 'bg-amber-600/20 text-amber-300' : 'text-[#d4c3b3] hover:bg-[#2b1d14]'
                  }`}
                >
                  <ClockIcon className="w-4 h-4 text-gray-500" />
                  <span>{h}</span>
                </button>
              ))}
            </div>
          )}

          {/* Curated query autocomplete */}
          <div className="p-2">
            <div className="px-4 py-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Autocomplete
              </span>
            </div>
            {suggestions.slice(0, 30).map((s, i) => {
              const idx = i
              return (
                <button
                  key={`s-${i}`}
                  onClick={() => handleSelect(s.text)}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition cursor-pointer ${
                    highlighted === idx ? 'bg-amber-600/20 text-amber-300' : 'text-[#d4c3b3] hover:bg-[#2b1d14]'
                  }`}
                >
                  {s.type === 'query' ? (
                    <SearchIcon className="w-4 h-4 text-amber-400" />
                  ) : (
                    <FireIcon className="w-4 h-4 text-orange-500" />
                  )}
                  <span>{highlightMatch(s.text, query)}</span>
                </button>
              )
            })}
            {suggestions.length === 0 && (
              <div className="px-4 py-4 text-sm text-gray-500 text-center">Type to search</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-amber-300 font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}
