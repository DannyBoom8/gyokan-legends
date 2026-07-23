'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

const SLOT_COLORS = {
  Champion: 'text-amber-400',
  Specialist: 'text-purple-400',
  Support: 'text-blue-400',
  Medic: 'text-green-400',
  Sub: 'text-zinc-400',
}

export default function Points() {
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState([])
  const [rankData, setRankData] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const [{ data: rank }, { data: latestGw }] = await Promise.all([
        supabase.from('user_ranks').select('*').eq('user_id', session.user.id).single(),
        supabase.from('gameweeks').select('gameweek_id').order('gameweek_id', { ascending: false }).limit(1).maybeSingle(),
      ])

      setRankData(rank)

      if (latestGw) {
        const { data: pointsData } = await supabase
          .from('fantasy_points')
          .select('*, characters(name, image_url, power_type)')
          .eq('user_id', session.user.id)
          .eq('gameweek_id', latestGw.gameweek_id)
          .order('final_points', { ascending: false })
        setPoints(pointsData || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-amber-500 text-sm">Loading...</p>
    </div>
  )

  const totalThisWeek = points.reduce((sum, p) => sum + (p.final_points || 0), 0)
  const seasonPoints = rankData?.season_points || 0

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-6">
        <button onClick={() => router.push('/dashboard')} className="text-zinc-500 text-sm mb-3 block">
          ← Dashboard
        </button>
        <h1 className="text-2xl font-bold">Points</h1>
      </div>

      <div className="mx-5 mb-5 grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Season total</p>
          <p className="text-white font-bold text-2xl">{seasonPoints}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">This week</p>
          <p className="text-amber-400 font-bold text-2xl">{totalThisWeek}</p>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-5">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-white font-bold text-lg mb-2">No points yet</h2>
          <p className="text-zinc-500 text-sm text-center leading-relaxed">
            Your breakdown will appear here after your first Thursday battle. Make sure your party is ready.
          </p>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-2">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">This week's breakdown</p>
          {points.map(p => (
            <div key={p.points_id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3">
              <img src={p.characters?.image_url} alt={p.characters?.name}
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-zinc-800" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.characters?.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${SLOT_COLORS[p.slot_type] || 'text-zinc-400'}`}>{p.slot_type}</span>
                  {p.medic_boost_applied && (
                    <span className="text-green-400 text-xs">⚡ Medic boost</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold">{p.final_points} pts</p>
                {p.medic_boost_applied && (
                  <p className="text-zinc-600 text-xs line-through">{p.base_points} pts</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav active="points" />
    </div>
  )
}