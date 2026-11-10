'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Icon, { IconTile } from '../../components/Icon'
import BottomNav from '../../components/BottomNav'
import PageSkeleton from '../../components/Skeleton'
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

  if (loading) return <PageSkeleton variant="dashboard" />

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
        <p className="label text-zinc-500 mb-2">Welcome back</p>
        <div className="flex items-center justify-between">
          <h1 className="display text-3xl">{user?.username}</h1>
          {isLegend && (
            <span className="hud bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Icon name="crown" size={14} className="icon-in" />Legend
            </span>
          )}
        </div>
      </div>

      <div className="mx-5 mb-4 enter" style={{ '--i': 1 }}>
        <div className={`rounded-[28px] border p-4 ${rank.bg}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="label text-zinc-500 mb-1.5">Rank</p>
              <p className={`display text-3xl ${rank.color}`}>{rank.name}</p>
            </div>
            <div className="text-right">
              <p className="label text-zinc-500 mb-1.5">Season points</p>
              <p className="num text-3xl text-white">{seasonPoints}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500 bar-fill" style={{ scale: `${progress / 100} 1` }} />
            </div>
            <p className="label text-zinc-500 mt-2.5 !tracking-[0.1em]">
              {upcoming ? `${formatPoints(upcoming.min - seasonPoints)} pts to ${upcoming.name}` : 'Top rank reached'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 rounded-xl p-3">
              <p className="label text-zinc-500 mb-2">Last battle</p>
              <p className="num text-xl text-white">{formatPoints(weekPoints)} <span className="label text-zinc-500">pts</span></p>
            </div>
            <div className="bg-black/30 rounded-xl p-3">
              <p className="label text-zinc-500 mb-2">Gold left</p>
              <p className={`num text-xl ${goldLeft < 0 ? 'text-red-400' : 'text-amber-400'}`}>{formatGold(goldLeft)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-3">
        <button onClick={() => router.push('/party')} style={{ '--i': 2 }}
          className="enter tile w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left press">
          <div className="flex items-center justify-between">
            <div>
              <p className="label text-zinc-500 mb-1.5">My Party</p>
              {partyCount === 0
                ? <p className="text-white font-semibold text-lg">Build your party</p>
                : <p className="text-white font-semibold text-lg"><span className="num">{partyCount}</span> <span className="text-zinc-500">/ 10 fighters</span></p>
              }
            </div>
            <IconTile name="swords" />
          </div>
          {partyCount === 0 && (
            <p className="text-zinc-500 text-sm mt-3">Draft 10 fighters and start scoring.</p>
          )}
          {partyCount > 0 && partyCount < 10 && (
            <p className="text-amber-500 text-sm mt-3">{10 - partyCount} empty slot{10 - partyCount === 1 ? '' : 's'} score nothing</p>
          )}
        </button>

        <button onClick={() => router.push('/battles')} style={{ '--i': 3 }}
          className="enter tile w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left press">
          <div className="flex items-center justify-between">
            <div>
              <p className="label text-zinc-500 mb-1.5">Battles</p>
              <p className="text-white font-semibold text-lg">
                Next battle {battleIsToday ? 'today' : `in ${daysToBattle} day${daysToBattle === 1 ? '' : 's'}`}
              </p>
            </div>
            <IconTile name="flame" index={1} />
          </div>
          <p className="text-zinc-500 text-sm mt-3">
            {battle.toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })} · last results
          </p>
        </button>

        <div className="grid grid-cols-2 gap-3 enter" style={{ '--i': 4 }}>
          <button onClick={() => router.push('/leaderboard')}
            className="tile bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left press">
            <div className="tile-icon text-amber-500 mb-3 origin-left w-fit"><Icon name="trophy" size={24} className="icon-in" style={{ '--i': 2 }} /></div>
            <p className="display text-base">Leaderboard</p>
            <p className="text-zinc-500 text-sm mt-1">See who leads</p>
          </button>
          <button onClick={() => router.push('/rules')}
            className="tile bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left press">
            <div className="tile-icon text-amber-500 mb-3 origin-left w-fit"><Icon name="scroll" size={24} className="icon-in" style={{ '--i': 3 }} /></div>
            <p className="display text-base">How to play</p>
            <p className="text-zinc-500 text-sm mt-1">Slots, types, ranks</p>
          </button>
        </div>
      </div>

      <BottomNav active="dashboard" />
    </div>
  )
}
