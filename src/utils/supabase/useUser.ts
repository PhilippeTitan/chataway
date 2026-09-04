'use client'

import { useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from './client'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInAnonymously = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase not configured') }
    }
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.warn('Anonymous sign-in warning:', error.message)
        return { data: null, error }
      }
      return { data, error: null }
    } catch (err) {
      console.error('Anonymous sign-in failed:', err)
      return { data: null, error: err }
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (err) {
      console.error('Sign-out failed:', err)
    }
  }, [])

  return {
    user,
    loading,
    isAnonymous: !!user?.is_anonymous,
    signInAnonymously,
    signOut,
  }
}
