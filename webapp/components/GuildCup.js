'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { byPoints } from '../lib/social'
import { weekOf } from '../lib/guild-rules'
import { isDemo } from '../lib/demo'
import { CUP_LIMITS, MAX_LEVEL, cupName } from '../lib/squad'
import { Panel, Caption } from './Manga'
import { Empty } from './Players'
import Icon from './Icon'
import Bouts from './Bouts'

const roundName = (fromEnd) => ['Final', 'Semi-finals', 'Quarter-finals'][fromEnd] || `${2 ** fromEnd} matches`

// the weekly knockout between tournament parties from every guild
export default function GuildCup({ me, parties, seats, onParties, onPlayed }) {
  const [data, setData] = useState(null)
  const [shown, setShown] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const justPlayed = useRef(false)

  const load = async () => {
    const [{ data: squad, error: failed }, { data: field }, { data: fieldSeats }, { data: cups }, { data: players }] = await Promise.all([
      supabase.from('squads').select('user_id').eq('user_id', me.user_id).maybeSingle(),
      supabase.from('guild_parties').select('*').eq('occasion', 'tournament').order('id'),
      supabase.from('guild_party_members').select('party_id, user_id').eq('occasion', 'tournament'),
      supabase.from('cups').select('*').order('id', { ascending: false }),
      byPoints(),
    ])
    setData({ failed: !!failed, squad: !!squad, field: field || [], fieldSeats: fieldSeats || [], cups: cups || [], names: Object.fromEntries((players || []).map(p => [p.user_id, p.username])) })
  }

  useEffect(() => { load() }, [seats])

  if (!data) return <p className="muted text-sm py-6 text-center">Loading the cup...</p>
  if (data.failed) return <Empty>Cups can only be tried in the demo for now.</Empty>

  const { squad, field, fieldSeats, cups, names } = data
  const played = cups.find(c => c.week === weekOf())
  const limit = played ? played.limit : CUP_LIMITS[cups.length % CUP_LIMITS.length]
  const inParty = seats.some(s => s.user_id === me.user_id && parties.some(p => p.id === s.party_id && p.occasion === 'tournament'))
  const latest = cups[0]

  const run = async (name) => {
    setBusy(true); setError(''); setShown(null)
    const { error } = await supabase.rpc(name)
    if (error) setError(error.message)
    justPlayed.current = !error && name === 'cup_play'
    await load()
    setBusy(false)
    if (!error && name === 'cup_play') onPlayed?.() // the member list shows the new badges
  }

  const step = !squad ? ['Pick your squad first. It is what fights in the cup.', 'Pick squad', () => router.push('/squad')]
    : !inParty ? ['Join or start a tournament party to enter.', 'See parties', onParties]
    : null

  return (
    <>
      {error && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-3" style={{ color: 'var(--spot-text)' }}>{error}</p>}

      <Panel i={1} className="mb-3" pageClass="flex flex-col">
        <Caption aside="This week">{cupName(limit)}</Caption>
        <div className="p-4">
          <p className="muted text-sm">
            Knockout between tournament parties from every guild. {limit < MAX_LEVEL ? `Fighters above level ${limit} fight at level ${limit}.` : 'Every fighter fights at full level.'} A drawn match goes to the party with more fighters standing.
          </p>
          <ul aria-label="Parties in the cup" className="flex flex-wrap gap-2 mt-3">
            {field.map(p => (
              <li key={p.id} className="label !whitespace-normal border-2 border-current/40 px-2 py-1.5">{p.name} · {fieldSeats.filter(s => s.party_id === p.id).length}</li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {step ? (
              <>
                <p className="flex-1 min-w-[12rem] text-sm font-semibold">{step[0]}</p>
                <button onClick={step[2]} className="btn-spot text-lg px-5 py-2.5">{step[1]}</button>
              </>
            ) : played ? (
              <>
                <p className="flex-1 min-w-[10rem] text-sm font-semibold">Played. The next cup is next week.</p>
                {isDemo() && <button onClick={() => run('cup_next')} disabled={busy} className="btn text-base px-4 py-2.5">Next cup (demo)</button>}
              </>
            ) : (
              <button onClick={() => run('cup_play')} disabled={busy} className="btn-spot poster text-2xl w-full py-3">Play the cup</button>
            )}
          </div>
        </div>
      </Panel>

      {!latest ? <Empty>No cup has been played yet.</Empty> : (
        <>
          <Panel key={latest.id} i={2} className="mb-3" pageClass="!bg-[#12100e] text-[#f3efe4] [--line:#f3efe4]">
            {/* the result lands below the fold on a phone, so bring it into view once */}
            <div role="status" className="p-5 text-center" ref={el => { if (el && justPlayed.current) { justPlayed.current = false; el.scrollIntoView({ block: 'center' }) } }}>
              <Icon name="trophy" size={34} className="inline" />
              <p className="label mt-2 opacity-70">{cupName(latest.limit)} champions</p>
              <p className="poster text-4xl mt-2 break-words">{latest.champion.name}</p>
              <p className="label mt-2">{latest.champion.tag}{latest.champion.guild_id === me.guild_id ? ' · your guild' : ''}</p>
              {latest.champion.members?.includes(me.user_id) && <p className="text-sm font-semibold mt-3">You earned the champion badge.</p>}
            </div>
          </Panel>

          {latest.rounds.map((matches, r) => ({ matches, r })).reverse().map(({ matches, r }) => (
            <section key={`${latest.id}-${r}`} className="mb-3">
              <h2 className="poster text-xl mb-2">{roundName(latest.rounds.length - 1 - r)}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 sm:items-start">
                {matches.map((m, i) => {
                  const id = `${latest.id}-${r}-${i}`, open = shown === id
                  return (
                    <li key={id} className={`box ${open || matches.length === 1 ? 'sm:col-span-2' : ''}`}>
                      <button onClick={() => setShown(open ? null : id)} aria-expanded={open} className="hov-row block w-full text-left">
                        {['a', 'b'].map(side => (
                          <span key={side} className={`flex items-center gap-3 px-3 py-2 ${m.winner === side ? 'bg-[var(--spot)] text-white' : ''}`}>
                            <span className="flex-1 min-w-0">
                              <span className="poster block text-xl break-words">{m[side].name}</span>
                              <span className="label block mt-1 opacity-75">{m[side].tag}{m.winner === side && <> · through</>}</span>
                            </span>
                            <span className="poster text-3xl">{side === 'a' ? m.score : m.against}</span>
                          </span>
                        ))}
                        <span className="label muted !whitespace-normal block px-3 py-2">{m.tied && 'Drawn, more fighters standing decided it · '}{open ? 'Hide bouts' : 'Show bouts'}</span>
                      </button>
                      {open && <Bouts bouts={m.bouts} names={names} me={me.user_id} label={cupName(latest.limit)} />}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          {cups.length > 1 && (
            <Panel i={3} pageClass="flex flex-col">
              <Caption>Earlier cups</Caption>
              <ul className="divide-y-2 divide-current/20 mt-2">
                {cups.slice(1, 6).map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="label muted">{cupName(c.limit)}</span>
                    <span className="poster text-lg text-right break-words min-w-0">{c.champion.name}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </>
  )
}
