'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'
import PageSkeleton from '../../components/Skeleton'
import { formatPoints, rankInfo } from '../../lib/game'
import Icon from '../../components/Icon'

export default function Leaderboard() {
  const [rows, setRows] = useState([])
  const [me, setMe] = useState(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const [{ data: board, error: err }, { data: profile }] = await Promise.all([
        supabase.from('leaderboard').select('*').order('season_points', { ascending: false }).limit(100),
        supabase.from('users').select('username').eq('id', session.user.id).maybeSingle(),
      ])
      setError(!!err)
      setRows(board || [])
      setMe(profile?.username)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageSkeleton variant="list" />

  const medalTone = ['text-amber-400', 'text-zinc-300', 'text-orange-400']

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-6 enter">
        <h1 className="display text-3xl">Leaderboard</h1>
        <p className="text-zinc-500 text-sm mt-1">Season points · top 100</p>
      </div>

      {error ? (
        <p className="px-5 text-zinc-500 text-sm">The leaderboard isn&apos;t set up yet.</p>
      ) : rows.length === 0 ? (
        <p className="px-5 text-zinc-500 text-sm">No players yet.</p>
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {rows.map((r, i) => {
            const rank = rankInfo(r.current_rank)
            const isMe = r.username === me
            return (
              <div key={r.username} style={{ '--i': i + 1 }}
                className={`enter rounded-2xl border p-3 flex items-center gap-3 ${isMe ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
                <span className={`w-8 flex justify-center num text-base ${medalTone[i] || 'text-zinc-500'}`}>{i < 3 ? <Icon name="medal" size={22} className="icon-in" style={{ '--i': i }} /> : i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {r.username}{isMe && <span className="text-amber-500 text-xs"> · you</span>}
                    {r.is_legend && <Icon name="crown" size={13} className="inline ml-1.5 -mt-0.5 text-amber-400" />}
                  </p>
                  <p className={`label !tracking-[0.1em] mt-1 ${rank.color}`}>{rank.name}</p>
                </div>
                <p className="num text-lg text-white">{formatPoints(r.season_points)}</p>
              </div>
            )
          })}
        </div>
      )}

      <BottomNav active="leaderboard" />
    </div>
  )
}
