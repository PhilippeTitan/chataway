'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'

export type SanctuaryTheme = 'obsidian' | 'amber-sunset' | 'midnight-velvet' | 'neon-crimson'

interface SanctuaryState {
  gender: 'man' | 'woman' | null
  interests: string[]
  theme: SanctuaryTheme
  isMuted: boolean
  vaultCount: number
}

type SanctuaryAction =
  | { type: 'SET_GENDER'; payload: 'man' | 'woman' | null }
  | { type: 'SET_INTERESTS'; payload: string[] }
  | { type: 'SET_THEME'; payload: SanctuaryTheme }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_VAULT_COUNT'; payload: number }

const initialState: SanctuaryState = {
  gender: null,
  interests: [],
  theme: 'obsidian',
  isMuted: false,
  vaultCount: 0,
}

function sanctuaryReducer(state: SanctuaryState, action: SanctuaryAction): SanctuaryState {
  switch (action.type) {
    case 'SET_GENDER':
      return { ...state, gender: action.payload }
    case 'SET_INTERESTS':
      return { ...state, interests: action.payload }
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted }
    case 'SET_VAULT_COUNT':
      return { ...state, vaultCount: action.payload }
    default:
      return state
  }
}

interface SanctuaryContextType {
  state: SanctuaryState
  setGender: (gender: 'man' | 'woman' | null) => void
  setInterests: (interests: string[]) => void
  setTheme: (theme: SanctuaryTheme) => void
  toggleMute: () => void
  setVaultCount: (count: number) => void
}

const SanctuaryContext = createContext<SanctuaryContextType | null>(null)

export const SanctuaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(sanctuaryReducer, initialState)

  // Sync state with storage on mount
  useEffect(() => {
    try {
      const storedGender = sessionStorage.getItem('gender') as 'man' | 'woman' | null
      const storedInterests = sessionStorage.getItem('interests')
      const storedTheme = localStorage.getItem('sanctuary_theme') as SanctuaryTheme | null

      if (storedGender) dispatch({ type: 'SET_GENDER', payload: storedGender })
      if (storedInterests) dispatch({ type: 'SET_INTERESTS', payload: JSON.parse(storedInterests) })
      if (storedTheme) dispatch({ type: 'SET_THEME', payload: storedTheme })
    } catch {}
  }, [])

  // Sync data-theme attribute on document root [Q41]
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (state.theme === 'obsidian') {
        document.documentElement.removeAttribute('data-theme')
      } else {
        document.documentElement.setAttribute('data-theme', state.theme)
      }
      try {
        localStorage.setItem('sanctuary_theme', state.theme)
      } catch {}
    }
  }, [state.theme])

  const setGender = (gender: 'man' | 'woman' | null) => {
    dispatch({ type: 'SET_GENDER', payload: gender })
    if (gender) sessionStorage.setItem('gender', gender)
    else sessionStorage.removeItem('gender')
  }

  const setInterests = (interests: string[]) => {
    dispatch({ type: 'SET_INTERESTS', payload: interests })
    sessionStorage.setItem('interests', JSON.stringify(interests))
  }

  const setTheme = (theme: SanctuaryTheme) => {
    dispatch({ type: 'SET_THEME', payload: theme })
  }

  const toggleMute = () => {
    dispatch({ type: 'TOGGLE_MUTE' })
  }

  const setVaultCount = (count: number) => {
    dispatch({ type: 'SET_VAULT_COUNT', payload: count })
  }

  return (
    <SanctuaryContext.Provider
      value={{
        state,
        setGender,
        setInterests,
        setTheme,
        toggleMute,
        setVaultCount,
      }}
    >
      {children}
    </SanctuaryContext.Provider>
  )
}

export function useSanctuary(): SanctuaryContextType {
  const context = useContext(SanctuaryContext)
  if (!context) {
    throw new Error('useSanctuary must be used within a SanctuaryProvider')
  }
  return context
}
