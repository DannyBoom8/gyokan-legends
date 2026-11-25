'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { fetchMe } from '../lib/social'
import { coinsOf } from '../lib/squad'

export const CHARACTER_COLUMNS = 'character_id, name, image_url, power_type'

// my squad row, every card I own and their characters; `act` runs a game action and reloads
export default function useCards() {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const load = async () => {
    const me = await fetchMe()
    if (!me) { router.push('/'); return }
    const [{ data: squad, error: failed }, { data: cards }, { data: rank }] = await Promise.all([
      supabase.from('squads').select('*').eq('user_id', me.user_id).maybeSingle(),
      supabase.from('fighters').select('*').eq('user_id', me.user_id),
      supabase.from('user_ranks').select('season_points, all_time_points').eq('user_id', me.user_id).maybeSingle(),
    ])
    const ids = (cards || []).map(c => c.character_id)
    const { data: chars } = ids.length
      ? await supabase.from('characters').select(CHARACTER_COLUMNS).in('character_id', ids)
      : { data: [] }
    // copies, so a change made by a database function always redraws
    setData({
      failed: !!failed,
      squad: squad && { ...squad },
      cards: (cards || []).map(c => ({ ...c })),
      chars: Object.fromEntries((chars || []).map(c => [c.character_id, c])),
      coins: coinsOf(rank?.all_time_points, squad),
      season: Number(rank?.season_points || 0),
    })
  }

  useEffect(() => { load() }, [])

  const act = async (name, args, done) => {
    setBusy(true); setError('')
    const { data: result, error } = await supabase.rpc(name, args)
    if (error) setError(error.message)
    await load()
    if (!error) done?.(result)
    setBusy(false)
  }

  return { data, busy, error, setError, act }
}
