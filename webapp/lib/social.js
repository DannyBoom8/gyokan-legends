import { supabase } from './supabase'

// the signed-in player's leaderboard row (guild, country, points); null when signed out
export async function fetchMe() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase.from('leaderboard').select('*').eq('user_id', session.user.id).maybeSingle()
  return { ...data, user_id: session.user.id }
}

export const byPoints = () => supabase.from('leaderboard').select('*').order('season_points', { ascending: false })

export const record = (p) => `${p.duel_wins || 0}W ${p.duel_losses || 0}L ${p.duel_draws || 0}D`
