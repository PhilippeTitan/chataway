import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

let client: ReturnType<typeof createBrowserClient> | null = null

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    // Return a stub client that won't crash — auth features just won't work
    if (!client) {
      client = createBrowserClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseKey || 'placeholder',
      )
    }
    return client
  }
  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseKey)
  }
  return client
}

export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseKey
