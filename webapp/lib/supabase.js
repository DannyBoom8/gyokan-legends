import { createClient } from '@supabase/supabase-js'
import { isDemo, createDemoClient } from './demo'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// demo mode swaps in a browser-only stand-in, so the app runs with no backend
export const supabase = isDemo() ? createDemoClient() : createClient(supabaseUrl, supabaseAnonKey)
