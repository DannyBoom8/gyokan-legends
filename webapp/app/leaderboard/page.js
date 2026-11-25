'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import PageSkeleton from '../../components/Skeleton'
import { formatPoints, rankInfo } from '../../lib/game'
import Icon from '../../components/Icon'
import { Screen, PageHead, Panel } from '../../components/Manga'
import { fetchAvatars, avatarFor } from '../../lib/avatar'

export default function Leaderboard() {
  const [rows, setRows] = useState([])
  const [me, setMe] = useState(null)
  const [avatars, setAvatars] = useState([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      fetchAvatars().then(setAvatars)

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

  return (
    <Screen nav="leaderboard" width="max-w-3xl">
      <PageHead title="Leaderboard" sub="Season points · top 100" />

      {error || rows.length === 0 ? (
        <p className="box muted text-sm px-5 py-10 text-center">{error ? 'The leaderboard isn’t set up yet.' : 'No players yet.'}</p>
      ) : (
        <Panel i={1}>
          <ol className="divide-y-[3px] divide-[var(--line)]">
            {rows.map((r, i) => {
              const rank = rankInfo(r.current_rank)
              const isMe = r.username === me
              return (
                <li key={r.username} aria-current={isMe ? 'true' : undefined}
                  className={`hov-row art flex items-center gap-3 p-3 ${isMe ? 'bg-[color-mix(in_oklab,var(--spot)_20%,var(--panel))]' : ''}`}>
                  <span className={`poster text-2xl w-11 h-11 flex items-center justify-center flex-shrink-0 ${i < 3 ? 'bg-[var(--spot)] text-white' : 'muted'}`}>{i + 1}</span>
                  <span className="block overflow-hidden border-2 border-[var(--line)] flex-shrink-0">
                    <img src={avatarFor(avatars, r.username, r.avatar_character_id)?.image_url} alt="" loading="lazy" className="block w-11 h-[52px] object-cover object-top" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="poster text-xl truncate">
                      {r.username}
                      {r.is_legend && <><Icon name="crown" size={16} className="inline ml-1.5 -mt-1" /><span className="sr-only"> Legend</span></>}
                    </p>
                    <p className={`label !tracking-[0.1em] mt-1.5 ${rank.color}`}>{rank.name}{isMe && <span className="text-white"> · you</span>}</p>
                  </div>
                  <p className="poster text-3xl">{formatPoints(r.season_points)}<span className="sr-only"> season points</span></p>
                </li>
              )
            })}
          </ol>
        </Panel>
      )}
    </Screen>
  )
}
