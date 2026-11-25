'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { byPoints, record, squadFight } from '../lib/social'
import { isDemo } from '../lib/demo'
import { CARD_RANKS, SQUAD_SIZE, WIN_POINTS, fightsLeft, inReach, squadRank, squadStrength } from '../lib/squad'
import RankTag, { rankLetter } from './RankTag'
import { Panel, Caption } from './Manga'
import { Empty } from './Players'
import Arena from './Arena'

// one on one: spar or battle any other squad
export default function Versus({ me }) {
  const [data, setData] = useState(null)
  const [battle, setBattle] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const load = async () => {
    const [{ data: squad, error: failed }, { data: fighters }, { data: players }] = await Promise.all([
      supabase.from('squads').select('*').eq('user_id', me.user_id).maybeSingle(),
      supabase.from('fighters').select('*').in('slot', [1, 2, 3, 4, 5, 6]),
      byPoints(),
    ])
    const ids = (fighters || []).map(f => f.character_id)
    const { data: chars } = ids.length
      ? await supabase.from('characters').select('character_id, name, image_url').in('character_id', ids)
      : { data: [] }
    const lineOf = (id) => (fighters || []).filter(f => f.user_id === id).sort((a, b) => a.slot - b.slot)
    const mine = lineOf(me.user_id)
    const strength = squadStrength(mine)
    const rivals = (players || []).filter(p => p.user_id !== me.user_id)
      .map(p => ({ ...p, line: lineOf(p.user_id) })).filter(p => p.line.length === SQUAD_SIZE)
      .map(p => ({ ...p, strength: squadStrength(p.line), rank: squadRank(p.line), reach: inReach(mine, p.line) }))
      .sort((a, b) => Math.abs(a.strength - strength) - Math.abs(b.strength - strength))
    const today = new Date().toISOString().slice(0, 10)
    setData({
      failed: !!failed, squad: !!squad, rivals, row: players?.find(p => p.user_id === me.user_id) || me,
      left: fightsLeft(squad, today), fought: squad?.day === today && squad.fights > 0,
      chars: Object.fromEntries((chars || []).map(c => [c.character_id, c])),
    })
  }

  useEffect(() => { load() }, [])

  const fight = async (rival, ranked) => {
    setBusy(true); setError('')
    const { battle, error } = await squadFight(rival, ranked)
    setBusy(false)
    if (error) return setError(error)
    setBattle(battle)
  }

  const newDay = async () => {
    setBusy(true); setError('')
    await supabase.rpc('squad_new_day')
    await load()
    setBusy(false)
  }

  if (!data) return <p className="muted text-sm py-6 text-center">Finding rivals...</p>
  if (data.failed) return <Empty>Battles can only be tried in the demo for now.</Empty>

  const { squad, rivals, row, left, chars } = data

  if (!squad) return (
    <Panel i={1} pageClass="flex flex-wrap items-center gap-3 p-4">
      <p className="flex-1 min-w-[12rem] text-sm">Pick your squad first. It is what fights.</p>
      <button onClick={() => router.push('/squad')} className="btn-spot text-lg px-5 py-2.5">Pick squad</button>
    </Panel>
  )

  return (
    <>
      {error && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-3" style={{ color: 'var(--spot-text)' }}>{error}</p>}

      <Panel i={1} className="mb-3" pageClass="flex flex-col">
        <dl className="grid grid-cols-2 divide-x-2 divide-current/25 p-4">
          {[['Ranked battles left today', left], ['Your record', record(row)]].map(([k, v]) => (
            <div key={k} className="min-w-0 px-3 first:pl-0">
              <dt className="label muted !text-[0.625rem] !whitespace-normal">{k}</dt>
              <dd className="poster text-3xl mt-1.5">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="px-4 pb-4">
          <p className="muted text-sm">
            Spar is practice with squads evened and no traits. Battle is ranked, against squads within one rank of yours: it goes on your record, and the first win over a rival each day earns an upgrade point and {WIN_POINTS} season points.
            {left < 1 && <> Out of ranked battles? <button onClick={() => router.push('/squad')} className="underline font-semibold text-[var(--ink)]">Buy one with coins</button>.</>}
          </p>
          {isDemo() && data.fought && <button onClick={newDay} disabled={busy} className="btn text-sm px-3 py-2 mt-3">New day (demo)</button>}
        </div>
      </Panel>

      <Panel i={2} pageClass="flex flex-col">
        <Caption aside="Closest rank first">Rivals</Caption>
        <ul className="divide-y-[3px] divide-[var(--line)] border-t-[3px] border-[var(--line)] mt-2">
          {rivals.map(p => (
            <li key={p.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              <div className="flex-1 min-w-[8rem]">
                <p className="poster text-xl break-words">{p.username}</p>
                <p className="label muted mt-1 !whitespace-normal">Squad rank {CARD_RANKS[p.rank]}{p.guild_tag ? ` · ${p.guild_tag}` : ''}{p.reach ? '' : ' · spar only'}</p>
              </div>
              <ul className="flex gap-1">
                {p.line.map(f => (
                  <li key={f.card_id} data-rank={rankLetter(f.upgrades)} className="rank-frame relative">
                    <img src={chars[f.character_id]?.image_url} alt={chars[f.character_id]?.name} title={chars[f.character_id]?.name} loading="lazy" className="block w-9 h-11 object-cover object-top" />
                    <RankTag upgrades={f.upgrades} className="absolute right-0 bottom-0 !text-[0.625rem] !px-1 !py-0.5" />
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                <button onClick={() => fight(p, false)} disabled={busy} aria-label={`Spar with ${p.username}`} className="btn text-base px-3 py-2.5">Spar</button>
                <button onClick={() => fight(p, true)} disabled={busy || left < 1 || !p.reach} aria-label={`Ranked battle against ${p.username}`} className="btn-spot text-base px-3 py-2.5">Battle</button>
              </div>
            </li>
          ))}
        </ul>
        {!rivals.length && <p className="muted text-sm p-4">No other squads yet.</p>}
      </Panel>

      {battle && (
        <Arena {...battle} onClose={() => { setBattle(null); load() }} onSpend={() => router.push('/squad')} />
      )}
    </>
  )
}
