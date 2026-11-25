'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import PageSkeleton from '../../components/Skeleton'
import { COUNTRIES } from '../../lib/game'
import { Screen, PageHead } from '../../components/Manga'
import { PlayerList, GuildList, PlayerSheet, Tabs, Empty } from '../../components/Players'
import { fetchAvatars } from '../../lib/avatar'
import { fetchMe, byPoints } from '../../lib/social'

export default function Leaderboard() {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('players')
  const [avatars, setAvatars] = useState([])
  const [selected, setSelected] = useState(null)
  const router = useRouter()

  const load = async () => {
    const me = await fetchMe()
    if (!me) { router.push('/'); return }
    const country = me.country_code || 'NG'
    const [players, guilds, members] = await Promise.all([
      byPoints().eq('country_code', country).limit(100),
      supabase.from('guild_leaderboard').select('*').eq('country_code', country).order('season_points', { ascending: false }).limit(100),
      me.guild_id ? byPoints().eq('guild_id', me.guild_id) : { data: [] },
    ])
    setData({ me, country, failed: !!(players.error || guilds.error), players: players.data || [], guilds: guilds.data || [], members: members.data || [] })
  }

  useEffect(() => { fetchAvatars().then(setAvatars); load() }, [])

  if (!data) return <PageSkeleton nav="leaderboard" title="Leaderboard" width="max-w-3xl" />

  const { me, country } = data
  const sub = { players: 'Season points · top 100 players', guilds: 'Guild points: every member’s season points', mine: me.guild_name || 'Your guild' }[tab]

  return (
    <Screen nav="leaderboard" width="max-w-3xl">
      <PageHead title="Leaderboard" sub={sub} aside={
        <p className="label flex items-center gap-2"><span className="bg-[var(--spot)] text-white px-2.5 py-1.5">{COUNTRIES[country]}</span><span className="muted hidden sm:inline">Worldwide soon</span></p>
      } />
      <Tabs label="Leaderboard" tabs={[['players', 'Players'], ['guilds', 'Guilds'], ['mine', 'My guild']]} value={tab} onChange={setTab} />

      {data.failed ? <Empty>The leaderboard isn’t set up yet.</Empty>
        : tab === 'players' ? (data.players.length ? <PlayerList rows={data.players} me={me.user_id} avatars={avatars} onOpen={setSelected} /> : <Empty>No players yet.</Empty>)
        : tab === 'guilds' ? (data.guilds.length ? <GuildList rows={data.guilds} mine={me.guild_id} /> : <Empty>No guilds yet.</Empty>)
        : data.members.length ? <PlayerList rows={data.members} me={me.user_id} avatars={avatars} onOpen={setSelected} showGuild={false} />
        : (
          <div className="box text-center px-5 py-10">
            <p className="muted text-sm mb-4">You’re not in a guild yet.</p>
            <button onClick={() => router.push('/guild')} className="btn-spot text-xl px-6 py-3">Find a guild</button>
          </div>
        )}

      {selected && <PlayerSheet key={selected.user_id} player={selected} me={me.user_id} avatars={avatars} onClose={() => setSelected(null)} onChange={load} />}
    </Screen>
  )
}
