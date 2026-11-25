'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { byPoints } from '../lib/social'
import { weekOf } from '../lib/guild-rules'
import { Panel, Caption } from './Manga'
import { Empty } from './Players'
import Bouts from './Bouts'

// my battle party against another guild's, each member bringing their squad
export default function GuildWar({ me, guilds, parties, seats, onParties }) {
  const [data, setData] = useState(null)
  const [shown, setShown] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const load = async () => {
    const [{ data: squad, error: failed }, { data: rivals }, { data: rivalSeats }, { data: wars }, { data: players }] = await Promise.all([
      supabase.from('squads').select('user_id').eq('user_id', me.user_id).maybeSingle(),
      supabase.from('guild_parties').select('*').eq('occasion', 'battle').order('id'),
      supabase.from('guild_party_members').select('party_id, user_id').eq('occasion', 'battle'),
      supabase.from('wars').select('*').or(`guild_id.eq.${me.guild_id},opponent_id.eq.${me.guild_id}`).order('id', { ascending: false }).limit(10),
      byPoints(),
    ])
    setData({ failed: !!failed, squad: !!squad, rivals: rivals || [], rivalSeats: rivalSeats || [], wars: wars || [], names: Object.fromEntries((players || []).map(p => [p.user_id, p.username])) })
  }

  useEffect(() => { load() }, [seats])

  if (!data) return <p className="muted text-sm py-6 text-center">Loading wars...</p>
  if (data.failed) return <Empty>Guild wars can only be tried in the demo for now.</Empty>

  const { squad, rivals, rivalSeats, wars, names } = data
  const guild = (id) => guilds.find(g => g.guild_id === id)
  const mySeat = seats.find(s => s.user_id === me.user_id && parties.some(p => p.id === s.party_id && p.occasion === 'battle'))
  const myParty = parties.find(p => p.id === mySeat?.party_id)
  const targets = rivals.filter(p => p.guild_id !== me.guild_id)
  const fought = (id) => wars.some(w => w.week === weekOf() && [w.guild_id, w.opponent_id].includes(id))

  const declare = async (party) => {
    setBusy(true); setError('')
    const { data: war, error } = await supabase.rpc('guild_war', { p_party: party.id })
    if (error) setError(error.message)
    else setShown(war.id)
    await load()
    setBusy(false)
  }

  const step = !squad ? ['Pick your squad first. It is what fights for your guild.', 'Pick squad', () => router.push('/squad')]
    : !myParty ? ['Join or start a battle party. Its members are your war team.', 'See parties', onParties]
    : null

  return (
    <>
      {error && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-3" style={{ color: 'var(--spot-text)' }}>{error}</p>}

      <Panel i={1} className="mb-3" pageClass="flex flex-col">
        <Caption aside={<span className="hidden min-[360px]:inline">{myParty?.name}</span>}>Declare war</Caption>
        {step ? (
          <div className="p-4 flex flex-wrap items-center gap-3">
            <p className="flex-1 min-w-[12rem] text-sm">{step[0]}</p>
            <button onClick={step[2]} className="btn-spot text-lg px-5 py-2.5">{step[1]}</button>
          </div>
        ) : (
          <>
            <p className="muted text-sm px-4 pt-3">Squads pair off, strongest first. An unmatched squad wins its bout. Once a week against each guild.</p>
            <ul className="divide-y-[3px] divide-[var(--line)] border-t-[3px] border-[var(--line)] mt-3">
              {targets.map(p => {
                const crew = rivalSeats.filter(s => s.party_id === p.id)
                const done = fought(p.guild_id)
                return (
                  <li key={p.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="poster text-xl break-words">{p.name}</p>
                      <p className="label muted !whitespace-normal mt-1.5">{guild(p.guild_id)?.name} · {crew.length} {crew.length === 1 ? 'member' : 'members'}</p>
                    </div>
                    <button onClick={() => declare(p)} disabled={busy || done} aria-label={`Declare war on ${p.name}`} className="btn-spot text-base px-4 py-2.5 flex-shrink-0">
                      {done ? 'Fought' : 'Fight'}
                    </button>
                  </li>
                )
              })}
            </ul>
            {!targets.length && <p className="muted text-sm p-4">No other guild has a battle party yet.</p>}
          </>
        )}
      </Panel>

      {wars.length === 0 ? <Empty>No wars yet.</Empty> : (
        <ul className="grid gap-3">
          {wars.map(w => {
            const attacking = w.guild_id === me.guild_id
            const other = guild(attacking ? w.opponent_id : w.guild_id)
            const [ours, theirs] = attacking ? [w.score, w.against] : [w.against, w.score]
            const verdict = w.winner_id == null ? 'Draw' : w.winner_id === me.guild_id ? 'Won' : 'Lost'
            const open = shown === w.id
            return (
              <li key={w.id} className="box">
                <button onClick={() => setShown(open ? null : w.id)} aria-expanded={open} className="hov-row w-full flex items-center gap-3 p-3 text-left">
                  <span className={`poster text-xl w-16 text-center py-1.5 flex-shrink-0 ${verdict === 'Won' ? 'bg-[var(--spot)] text-white' : 'border-2 border-current/40'}`}>{verdict}</span>
                  <span className="flex-1 min-w-0">
                    <span className="poster block text-xl break-words">vs {other?.name || 'A guild that has gone'}</span>
                    <span className="label muted block mt-1">{open ? 'Hide bouts' : 'Show bouts'}</span>
                  </span>
                  <span className="poster text-3xl flex-shrink-0">{ours}–{theirs}</span>
                </button>
                {open && (
                  <Bouts bouts={w.bouts} names={names} me={me.user_id} label="Guild war"
                    note={x => (x.winner === 'a') === attacking ? 'Our bout' : 'Their bout'} />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
