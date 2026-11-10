'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'
import { BUDGET, formatGold, formatPoints, nextBattle, nextRank, rankInfo } from '../../lib/game'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [rankData, setRankData] = useState(null)
  const [slots, setSlots] = useState([])
  const [weekPoints, setWeekPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const uid = session.user.id

      const [{ data: userData }, { data: rank }, { data: party }, { data: gw }] = await Promise.all([
        supabase.from('users').select('username').eq('id', uid).single(),
        supabase.from('user_ranks').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('parties').select('id').eq('user_id', uid).maybeSingle(),
        supabase.from('gameweeks').select('gameweek_id').order('gameweek_id', { ascending: false }).limit(1).maybeSingle(),
      ])

      setUser(userData)
      setRankData(rank)

      const [slotRes, pointsRes] = await Promise.all([
        party
          ? supabase.from('party_slots').select('id, characters(gold_cost)').eq('party_id', party.id)
          : { data: [] },
        gw
          ? supabase.from('fantasy_points').select('final_points').eq('user_id', uid).eq('gameweek_id', gw.gameweek_id)
          : { data: [] },
      ])
      setSlots(slotRes.data || [])
      setWeekPoints((pointsRes.data || []).reduce((sum, p) => sum + Number(p.final_points || 0), 0))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-amber-500 text-sm fade-in-late">Loading...</p>
    </div>
  )

  const rank = rankInfo(rankData?.current_rank)
  const seasonPoints = formatPoints(rankData?.season_points)
  const isLegend = rankData?.is_legend || false
  const upcoming = nextRank(seasonPoints)
  const progress = upcoming ? Math.min(100, ((seasonPoints - rank.min) / (upcoming.min - rank.min)) * 100) : 100
  const partyCount = slots.length
  const goldLeft = BUDGET - slots.reduce((sum, s) => sum + (s.characters?.gold_cost || 0), 0)
  const battle = nextBattle()
  const battleIsToday = battle.toDateString() === new Date().toDateString()
  const daysToBattle = Math.max(1, Math.round((battle - new Date()) / 86400000))

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-6 enter">
        <p className="text-zinc-600 text-xs tracking-widest uppercase mb-1">Welcome back</p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{user?.username}</h1>
          {isLegend && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
              ⚡ Legend
            </span>
          )}
        </div>
      </div>

      <div className="mx-5 mb-4 enter" style={{ '--i': 1 }}>
        <div className={`rounded-[28px] border p-4 ${rank.bg}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Rank</p>
              <p className={`text-2xl font-bold ${rank.color}`}>{rank.name}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Season points</p>
              <p className="text-2xl font-bold text-white tabular-nums">{seasonPoints}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500 bar-fill" style={{ scale: `${progress / 100} 1` }} />
            </div>
            <p className="text-zinc-500 text-xs mt-2">
              {upcoming ? `${formatPoints(upcoming.min - seasonPoints)} pts to ${upcoming.name}` : 'Top rank reached'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-zinc-500 text-xs mb-1">Last battle night</p>
              <p className="text-white font-bold text-lg tabular-nums">{formatPoints(weekPoints)} pts</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-zinc-500 text-xs mb-1">Gold left</p>
              <p className={`font-bold text-lg tabular-nums ${goldLeft < 0 ? 'text-red-400' : 'text-amber-400'}`}>{formatGold(goldLeft)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-3">
        <button onClick={() => router.push('/party')} style={{ '--i': 2 }}
          className="enter w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left press">
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
            <p className="text-amber-500/70 text-xs mt-2">{10 - partyCount} slots still empty — empty slots score nothing</p>
          )}
        </button>

        <button onClick={() => router.push('/battles')} style={{ '--i': 3 }}
          className="enter w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left press">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Battles</p>
              <p className="text-white font-semibold">
                Next battle {battleIsToday ? 'today' : `in ${daysToBattle} day${daysToBattle === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl">🔥</div>
          </div>
          <p className="text-zinc-600 text-xs mt-2">
            {battle.toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })} · see last results
          </p>
        </button>

        <div className="grid grid-cols-2 gap-3 enter" style={{ '--i': 4 }}>
          <button onClick={() => router.push('/leaderboard')}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left press">
            <div className="text-2xl mb-2">🏆</div>
            <p className="text-white font-semibold text-sm">Leaderboard</p>
            <p className="text-zinc-600 text-xs mt-0.5">See who leads</p>
          </button>
          <button onClick={() => router.push('/rules')}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left press">
            <div className="text-2xl mb-2">📜</div>
            <p className="text-white font-semibold text-sm">How to play</p>
            <p className="text-zinc-600 text-xs mt-0.5">Slots, types, ranks</p>
          </button>
        </div>
      </div>

      <BottomNav active="dashboard" />
    </div>
  )
}
