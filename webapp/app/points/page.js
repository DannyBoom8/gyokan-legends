'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import PageSkeleton from '../../components/Skeleton'
import { SLOT_COLORS, formatPoints } from '../../lib/game'
import Icon from '../../components/Icon'
import { Screen, PageHead, Panel, Caption } from '../../components/Manga'

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
        supabase.from('user_ranks').select('*').eq('user_id', session.user.id).maybeSingle(),
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

  if (loading) return <PageSkeleton nav="points" title="Points" width="max-w-3xl" />

  const totalThisWeek = formatPoints(points.reduce((sum, p) => sum + Number(p.final_points || 0), 0))
  const seasonPoints = formatPoints(rankData?.season_points)

  return (
    <Screen nav="points" width="max-w-3xl">
      <PageHead title="Points" sub="Your scoring log" />

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Panel i={1} className="hov" pageClass="p-4">
            <p className="label muted">Season total</p>
            <p className="poster text-5xl mt-2">{seasonPoints}</p>
          </Panel>
          <Panel i={2} className="hov" pageClass="!bg-[#12100e] text-[#f3efe4] p-4">
            <div className="tone absolute -z-10 inset-0" style={{ '--ink': '#f3efe4' }} aria-hidden="true" />
            <p className="label">Last battle</p>
            <p className="poster text-5xl mt-2">{totalThisWeek}</p>
          </Panel>
        </div>

        {points.length === 0 ? (
          <Panel i={3} pageClass="flex flex-col items-center text-center py-12 px-5">
            <Icon name="chart" size={48} />
            <h2 className="poster text-3xl mt-4 mb-3">No points yet</h2>
            <p className="muted text-sm leading-relaxed max-w-xs">
              Your breakdown will appear here after your first Thursday battle. Make sure your lineup is ready.
            </p>
          </Panel>
        ) : (
          <Panel i={3}>
            <Caption>Last battle night</Caption>
            <ul className="divide-y-2 divide-current/20 px-3 py-1">
              {points.map(p => (
                <li key={p.points_id} className="hov-row py-3 px-2 flex items-center gap-3">
                  <img src={p.characters?.image_url} alt="" className="w-12 h-14 object-cover object-top border-2 border-[var(--line)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="poster text-lg truncate">{p.characters?.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <span className={`label ${SLOT_COLORS[p.slot_type] || 'muted'}`}>{p.slot_type}</span>
                      {p.medic_boost_applied && (
                        <span className="hud !p-0 text-green-400 !tracking-[0.08em]"><Icon name="bolt" size={12} />Medic boost</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`poster text-2xl ${Number(p.final_points) > 0 ? '' : 'muted'}`}>{formatPoints(p.final_points)} pts</p>
                    {p.medic_boost_applied && <p className="muted text-xs line-through mt-1">{p.base_points} pts</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </Screen>
  )
}
