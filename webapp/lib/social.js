import { supabase } from './supabase'

// the signed-in player's leaderboard row (guild, country, points); null when signed out
export async function fetchMe() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase.from('leaderboard').select('*').eq('user_id', session.user.id).maybeSingle()
  return { ...data, user_id: session.user.id }
}

export const byPoints = () => supabase.from('leaderboard').select('*').order('season_points', { ascending: false })

export const record = (p) => `${p.duel_wins || 0}W ${p.duel_losses || 0}L`

// one fight between squads, with the pictures its replay needs
export async function squadFight(opponent, ranked) {
  const { data: result, error } = await supabase.rpc('squad_battle', { p_opponent: opponent.user_id, p_ranked: ranked })
  if (error) return { error: error.message }
  const ids = [...result.a.fighters, ...result.b.fighters].map(f => f.character_id)
  const { data: chars } = await supabase.from('characters').select('character_id, name, image_url, power_type').in('character_id', ids)
  return { battle: { result, rival: opponent.username, chars: Object.fromEntries((chars || []).map(c => [c.character_id, c])) } }
}
