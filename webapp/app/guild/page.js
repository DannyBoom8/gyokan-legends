'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { fetchMe, byPoints } from '../../lib/social'
import { fetchAvatars } from '../../lib/avatar'
import { COUNTRIES, GUILD_MAX, OCCASIONS, PARTY_MAX, formatPoints } from '../../lib/game'
import PageSkeleton from '../../components/Skeleton'
import { Screen, PageHead, Panel, Caption } from '../../components/Manga'
import { PlayerList, GuildList, PlayerSheet, Portrait, Tabs, Empty } from '../../components/Players'
import GuildWar from '../../components/GuildWar'
import GuildCup from '../../components/GuildCup'

export default function Guild() {
  const [data, setData] = useState(null)
  const [avatars, setAvatars] = useState([])
  const [tab, setTab] = useState('members')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [form, setForm] = useState({ name: '', tag: '', party: '', occasion: 'battle' })
  const router = useRouter()

  const load = async () => {
    const me = await fetchMe()
    if (!me) { router.push('/'); return }
    const country = me.country_code || 'NG'
    const [{ data: guilds, error: failed }, { data: members }, { data: parties }] = await Promise.all([
      supabase.from('guild_leaderboard').select('*').eq('country_code', country).order('season_points', { ascending: false }).limit(100),
      me.guild_id ? byPoints().eq('guild_id', me.guild_id) : { data: [] },
      me.guild_id ? supabase.from('guild_parties').select('*').eq('guild_id', me.guild_id).order('id') : { data: [] },
    ])
    const { data: seats } = parties?.length
      ? await supabase.from('guild_party_members').select('party_id, user_id').in('party_id', parties.map(p => p.id))
      : { data: [] }
    setData({ me, country, failed: !!failed, guilds: guilds || [], members: members || [], parties: parties || [], seats: seats || [] })
  }

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab')
    if (['parties', 'war', 'cup'].includes(wanted)) setTab(wanted)
    fetchAvatars().then(setAvatars)
    load()
  }, [])

  // every change goes through a database function, then the page reloads what it shows
  const act = async (name, args, done) => {
    setBusy(true); setError('')
    const { error } = await supabase.rpc(name, args)
    if (error) setError(error.message)
    else done?.()
    await load()
    setBusy(false)
  }

  if (!data) return <PageSkeleton variant="list" />

  const { me, country, guilds, members, parties, seats } = data
  const guild = guilds.find(g => g.guild_id === me.guild_id)
  const field = (key, transform = v => v) => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: transform(e.target.value) })) })
  const alert = error && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-3" style={{ color: 'var(--spot-text)' }}>{error}</p>
  const sheet = selected && (
    <PlayerSheet key={selected.user_id} player={selected} me={me.user_id} avatars={avatars} onClose={() => setSelected(null)} onChange={load} />
  )

  if (data.failed) return (
    <Screen nav="guild" width="max-w-3xl">
      <PageHead title="Guilds" />
      <Empty>Guilds aren&apos;t set up yet.</Empty>
    </Screen>
  )

  if (!guild) return (
    <Screen nav="guild" width="max-w-3xl">
      <PageHead title="Guilds" sub={`Join one in ${COUNTRIES[country]}, or start your own`} />
      {alert}
      <Panel i={1} className="hov mb-3" pageClass="flex flex-col">
        <Caption>Start a guild</Caption>
        <form onSubmit={e => { e.preventDefault(); act('create_guild', { p_name: form.name, p_tag: form.tag }) }}
          className="p-4 grid grid-cols-[minmax(0,1fr)_6rem] sm:grid-cols-[minmax(0,1fr)_7rem_auto] gap-2">
          <input {...field('name')} required minLength={3} maxLength={24} placeholder="Guild name" aria-label="Guild name" className="field" />
          <input {...field('tag', v => v.toUpperCase())} required minLength={2} maxLength={4} placeholder="TAG" aria-label="Guild tag, 2 to 4 characters" className="field" />
          <button disabled={busy} className="btn-spot text-xl px-6 py-3 col-span-2 sm:col-span-1">Create</button>
        </form>
      </Panel>
      {guilds.length ? (
        <GuildList rows={guilds} action={g => (
          <button onClick={() => act('join_guild', { p_guild: g.guild_id })} disabled={busy || g.members >= GUILD_MAX}
            aria-label={`Join ${g.name}`} className="btn text-base px-3 py-2">{g.members >= GUILD_MAX ? 'Full' : 'Join'}</button>
        )} />
      ) : <Empty>No guilds in {COUNTRIES[country]} yet. Start the first one.</Empty>}
    </Screen>
  )

  const guildPlace = guilds.findIndex(g => g.guild_id === guild.guild_id) + 1
  const myPlace = members.findIndex(m => m.user_id === me.user_id) + 1
  const stats = [[`${COUNTRIES[country]} rank`, `#${guildPlace}`], ['Guild points', formatPoints(guild.season_points)], ['Your place', `#${myPlace}`]]

  return (
    <Screen nav="guild" width="max-w-3xl">
      <PageHead title={guild.name} sub={`${guild.tag} · ${COUNTRIES[country]} · ${guild.members}/${GUILD_MAX} members`}
        aside={
          <button disabled={busy} onBlur={() => setLeaving(false)} aria-pressed={leaving}
            onClick={() => leaving ? act('leave_guild', {}, () => setLeaving(false)) : setLeaving(true)}
            className="btn text-sm px-3 py-2">{leaving ? 'Tap again to leave' : 'Leave'}</button>
        } />
      {alert}

      <Panel i={1} className="hov mb-3">
        <dl className="grid grid-cols-3 divide-x-2 divide-current/25 p-4">
          {stats.map(([k, v]) => (
            <div key={k} className="px-3 first:pl-0">
              <dt className="label muted !text-[0.625rem] !whitespace-normal">{k}</dt>
              <dd className="poster text-3xl mt-1.5">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Tabs label="Guild" tabs={[['members', 'Members'], ['parties', 'Parties'], ['war', 'War'], ['cup', 'Cup']]} value={tab} onChange={t => { setTab(t); setError('') }} />

      {tab === 'members' && <PlayerList rows={members} me={me.user_id} avatars={avatars} onOpen={setSelected} showGuild={false} />}

      {tab === 'parties' && (
        <>
          <Panel i={1} className="mb-3" pageClass="flex flex-col">
            <Caption>Start a party</Caption>
            <form onSubmit={e => { e.preventDefault(); act('create_party', { p_name: form.party, p_occasion: form.occasion }, () => setForm(f => ({ ...f, party: '' }))) }}
              className="p-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
              <input {...field('party')} required minLength={3} maxLength={24} placeholder="Party name" aria-label="Party name" className="field" />
              <div role="group" aria-label="Occasion" className="grid grid-cols-2 gap-2">
                {OCCASIONS.map(([id, text]) => (
                  <button type="button" key={id} onClick={() => setForm(f => ({ ...f, occasion: id }))} aria-pressed={form.occasion === id} className="btn text-base px-3 py-2.5">{text}</button>
                ))}
              </div>
              <button disabled={busy} className="btn-spot text-xl px-6 py-3">Create</button>
            </form>
          </Panel>

          {parties.length === 0 ? <Empty>No parties yet. Start one for the next battle night.</Empty> : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {parties.map(p => {
                const crew = seats.filter(s => s.party_id === p.id).map(s => members.find(m => m.user_id === s.user_id)).filter(Boolean)
                const joined = crew.some(m => m.user_id === me.user_id)
                // one party per occasion: say why joining is off
                const elsewhere = !joined && parties.some(o => o.occasion === p.occasion && seats.some(s => s.party_id === o.id && s.user_id === me.user_id))
                const full = crew.length >= PARTY_MAX
                return (
                  <li key={p.id} className="box hov flex flex-col">
                    <div className="flex items-start justify-between gap-2 p-3 border-b-[3px] border-[var(--line)]">
                      <div className="min-w-0">
                        <h3 className="poster text-2xl truncate">{p.name}</h3>
                        <p className="label muted mt-1.5">{p.occasion} party · {crew.length}/{PARTY_MAX}</p>
                      </div>
                      {joined && <span className="label bg-[var(--spot)] text-white px-2 py-1">You&apos;re in</span>}
                    </div>
                    <ul className="grid grid-cols-5 gap-2 p-3">
                      {Array.from({ length: PARTY_MAX }, (_, i) => crew[i]).map((m, i) => (
                        <li key={m?.user_id || i} className="min-w-0">
                          {m ? (
                            <button onClick={() => setSelected(m)} className="hov-thumb block w-full text-center">
                              <span className="block"><Portrait player={m} avatars={avatars} className="w-full aspect-[3/4]" /></span>
                              <span className="block text-[0.6875rem] font-semibold truncate mt-1">{m.username}{p.captain_id === m.user_id && <span className="sr-only">, captain</span>}</span>
                              {p.captain_id === m.user_id && <span aria-hidden="true" className="label muted block !text-[0.5625rem]">Captain</span>}
                            </button>
                          ) : <span className="block aspect-[3/4] border-2 border-dashed border-[var(--line)] opacity-60"><span className="sr-only">Open seat</span></span>}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-center justify-between gap-3 p-3 border-t-2 border-current/25">
                      <p className="text-sm">
                        {p.occasion === 'battle'
                          ? <><span className="poster text-xl">{formatPoints(crew.reduce((n, m) => n + Number(m.week_points || 0), 0))} pts</span> <span className="muted">last battle night</span></>
                          : <button onClick={() => setTab('cup')} className="underline font-semibold">This week&apos;s cup</button>}
                      </p>
                      <button disabled={busy || (!joined && (elsewhere || full))} onClick={() => act(joined ? 'leave_party' : 'join_party', { p_party: p.id })}
                        className={`${joined ? 'btn' : 'btn-spot'} text-base px-4 py-2 flex-shrink-0`}>
                        {joined ? 'Leave' : full ? 'Full' : elsewhere ? 'In another' : 'Join'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
      {tab === 'war' && <GuildWar me={me} guilds={guilds} parties={parties} seats={seats} onParties={() => setTab('parties')} />}
      {tab === 'cup' && <GuildCup me={me} parties={parties} seats={seats} onParties={() => setTab('parties')} onPlayed={load} />}
      {sheet}
    </Screen>
  )
}
