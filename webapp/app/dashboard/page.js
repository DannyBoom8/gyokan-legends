'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

const RANK_COLORS = {
  Legendary: 'text-amber-400',
  Sovereign: 'text-purple-400',
  Warlord: 'text-red-400',
  Veteran: 'text-blue-400',
  Ronin: 'text-zinc-400',
  Rookie: 'text-zinc-500',
}

const RANK_BG = {
  Legendary: 'border-amber-500/30 bg-amber-500/5',
  Sovereign: 'border-purple-500/30 bg-purple-500/5',
  Warlord: 'border-red-500/30 bg-red-500/5',
  Veteran: 'border-blue-500/30 bg-blue-500/5',
  Ronin: 'border-zinc-600/30 bg-zinc-800/30',
  Rookie: 'border-zinc-700/30 bg-zinc-900/50',
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [rankData, setRankData] = useState(null)
  const [partyCount, setPartyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const [{ data: userData }, { data: rank }, { data: party }] = await Promise.all([
        supabase.from('users').select('username').eq('id', session.user.id).single(),
        supabase.from('user_ranks').select('*').eq('user_id', session.user.id).single(),
        supabase.from('parties').select('id').eq('user_id', session.user.id).maybeSingle(),
      ])

      setUser(userData)
      setRankData(rank)

      if (party) {
        const { count } = await supabase
          .from('party_slots')
          .select('*', { count: 'exact', head: true })
          .eq('party_id', party.id)
        setPartyCount(count || 0)
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

  const rank = rankData?.current_rank || 'Rookie'
  const seasonPoints = rankData?.season_points || 0
  const isLegend = rankData?.is_legend || false

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-6">
        <p className="text-zinc-600 text-xs tracking-widest uppercase mb-1">Welcome back</p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{user?.username}</h1>
          {isLegend && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
              ⚡ Legend
            </span>
          )}
        </div>
      </div>

      <div className="mx-5 mb-4">
        <div className={`rounded-2xl border p-5 ${RANK_BG[rank]}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Rank</p>
              <p className={`text-2xl font-bold ${RANK_COLORS[rank]}`}>{rank}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Season points</p>
              <p className="text-2xl font-bold text-white">{seasonPoints}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-zinc-500 text-xs mb-1">This week</p>
              <p className="text-white font-bold text-lg">0 pts</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-zinc-500 text-xs mb-1">Gold</p>
              <p className="text-amber-400 font-bold text-lg">100M</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-3">
        <button onClick={() => router.push('/party')}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left active:scale-95 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">My Party</p>
              {partyCount === 0
                ? <p className="text-white font-semibold">Create your party →</p>
                : <p className="text-white font-semibold">{partyCount} / 10 characters</p>
              }
            </div>
            <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl">⚔️</div>
          </div>
          {partyCount === 0 && (
            <p className="text-zinc-600 text-xs mt-2">Pick 10 characters and start earning points</p>
          )}
          {partyCount > 0 && partyCount < 10 && (
            <p className="text-amber-500/70 text-xs mt-2">{10 - partyCount} slots still empty</p>
          )}
        </button>

        <button onClick={() => router.push('/battles')}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left active:scale-95 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Battles</p>
              <p className="text-white font-semibold">This week's results</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl">🔥</div>
          </div>
          <p className="text-zinc-600 text-xs mt-2">Battles happen every Thursday</p>
        </button>

        <button onClick={() => router.push('/points')}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left active:scale-95 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Points</p>
              <p className="text-white font-semibold">{seasonPoints} total this season</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl">📊</div>
          </div>
          <p className="text-zinc-600 text-xs mt-2">Tap to see full breakdown</p>
        </button>
      </div>

      <BottomNav active="dashboard" />
    </div>
  )
}