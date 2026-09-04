'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SearchIcon, FireIcon, ClockIcon, XIcon } from '@/components/icons'

interface Suggestion {
  text: string
  type: string
}

interface SearchAutocompleteProps {
  onSearch: (query: string) => void
  placeholder?: string
  autoFocus?: boolean
}

const HISTORY_KEY = 'chataway_search_history'
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

export default function SearchAutocomplete({ onSearch, placeholder = 'Search videos...', autoFocus = false }: SearchAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [trending, setTrending] = useState<Suggestion[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fetchTimer = useRef<NodeJS.Timeout | null>(null)

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory())
  }, [])

  // Fetch trending when input first focused with empty query
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/suggestions?q=')
        const data = await res.json()
        setTrending(data.suggestions || [])
      } catch (err) {
        console.error(err)
      }
    }
    fetchTrending()
  }, [])

  // Fetch suggestions when query changes
  useEffect(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current)

    fetchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      } catch (err) {
        console.error(err)
      }
    }, 200)

    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current) }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
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
    onSearch(text)
    inputRef.current?.blur()
  }, [onSearch])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      handleSelect(query.trim())
    }
  }, [query, handleSelect])

  const getAllItems = useCallback((): Suggestion[] => {
    const items: Suggestion[] = []
    if (history.length > 0) {
      items.push(...history.slice(0, 3).map(h => ({ text: h, type: 'history' })))
    }
    const src = query.length > 0 ? suggestions : trending
    items.push(...src.slice(0, 8))
    return items
  }, [history, query, suggestions, trending])

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

  const showDropdown = open

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
            className="w-full pl-12 pr-12 py-4 bg-gray-900 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg transition-all"
            autoFocus={autoFocus}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {/* Recent Searches */}
          {history.length > 0 && (
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
                    highlighted === i ? 'bg-purple-600/30 text-purple-400' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <ClockIcon className="w-4 h-4 text-gray-500" />
                  <span>{h}</span>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions / Trending */}
          <div className="p-2">
            <div className="px-4 py-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {query.length > 0 ? 'Suggestions' : 'Trending'}
              </span>
            </div>
            {(query.length > 0 ? suggestions : trending).slice(0, 8).map((s, i) => {
              const idx = history.length + i
              return (
                <button
                  key={`s-${i}`}
                  onClick={() => handleSelect(s.text)}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition cursor-pointer ${
                    highlighted === idx ? 'bg-purple-600/30 text-purple-400' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <FireIcon className="w-4 h-4 text-orange-500" />
                  <span>{highlightMatch(s.text, query)}</span>
                </button>
              )
            })}
            {(query.length > 0 ? suggestions : trending).length === 0 && (
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
      <span className="text-purple-400 font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}
