'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { fetchMe } from '../../lib/social'
import PageSkeleton from '../../components/Skeleton'
import { Screen, PageHead, Panel } from '../../components/Manga'
import { Tabs } from '../../components/Players'
import Versus from '../../components/Versus'
import GuildWar from '../../components/GuildWar'
import GuildCup from '../../components/GuildCup'

// every kind of fight between players; the Squad and Guild pages only set the teams up
export default function Battle() {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('versus')
  const router = useRouter()

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab')
    if (['war', 'cup'].includes(wanted)) setTab(wanted)
    const load = async () => {
      const me = await fetchMe()
      if (!me) { router.push('/'); return }
      const [{ data: guilds }, { data: parties }] = await Promise.all([
        supabase.from('guild_leaderboard').select('*').eq('country_code', me.country_code || 'NG').order('season_points', { ascending: false }).limit(100),
        me.guild_id ? supabase.from('guild_parties').select('*').eq('guild_id', me.guild_id).order('id') : { data: [] },
      ])
      const { data: seats } = parties?.length
        ? await supabase.from('guild_party_members').select('party_id, user_id').in('party_id', parties.map(p => p.id))
        : { data: [] }
      setData({ me, guilds: guilds || [], parties: parties || [], seats: seats || [] })
    }
    load()
  }, [])

  if (!data) return <PageSkeleton nav="battle" title="Battle" width="max-w-3xl" />

  const { me, guilds, parties, seats } = data
  const toParties = () => router.push('/guild?tab=parties')

  return (
    <Screen nav="battle" width="max-w-3xl">
      <PageHead title="Battle" sub="Your squad against theirs" />
      <Tabs label="Kind of battle" tabs={[['versus', 'Versus'], ['war', 'Guild war'], ['cup', 'Tournament']]} value={tab} onChange={setTab} />

      {tab === 'versus' ? <Versus me={me} />
        : !me.guild_id ? (
          <Panel i={1} pageClass="flex flex-wrap items-center gap-3 p-4">
            <p className="flex-1 min-w-[12rem] text-sm">Join a guild first. Wars and tournaments are fought by guild parties.</p>
            <button onClick={() => router.push('/guild')} className="btn-spot text-lg px-5 py-2.5">Find a guild</button>
          </Panel>
        )
        : tab === 'war' ? <GuildWar me={me} guilds={guilds} parties={parties} seats={seats} onParties={toParties} />
        : <GuildCup me={me} parties={parties} seats={seats} onParties={toParties} />}
    </Screen>
  )
}
