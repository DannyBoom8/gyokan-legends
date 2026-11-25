'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { isDemo } from '../../lib/demo'
import { fetchMe, byPoints } from '../../lib/social'
import { DAILY_FIGHTS, EXTRA_PER_WEEK, MAX_LEVEL, PRICES, SQUAD_SIZE, TACTICS, creditsOf, fightsLeft, squadLevel, xpToNext } from '../../lib/squad'
import { weekOf } from '../../lib/guild-rules'
import PageSkeleton from '../../components/Skeleton'
import { Screen, PageHead, Panel, Caption } from '../../components/Manga'
import { Empty } from '../../components/Players'
import FighterPicker from '../../components/FighterPicker'
import FighterSheet from '../../components/FighterSheet'
import Arena from '../../components/Arena'

const STEPS = [['Pick', 'Three favourites'], ['Battle', 'Earn XP'], ['Level up', 'Get 3 points'], ['Train', 'Place them your way']]

export default function Squad() {
  const [data, setData] = useState(null)
  const [picked, setPicked] = useState([])
  const [open, setOpen] = useState(null)
  const [battle, setBattle] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const load = async () => {
    const me = await fetchMe()
    if (!me) { router.push('/'); return }
    const [{ data: squad, error: failed }, { data: fighters }, { data: players }, { data: ranks }] = await Promise.all([
      supabase.from('squads').select('*').eq('user_id', me.user_id).maybeSingle(),
      supabase.from('fighters').select('*').in('slot', [1, 2, 3]),
      byPoints(),
      supabase.from('user_ranks').select('all_time_points').eq('user_id', me.user_id).maybeSingle(),
    ])
    const ids = (fighters || []).map(f => f.character_id)
    const { data: chars } = ids.length
      ? await supabase.from('characters').select('character_id, name, image_url, power_type').in('character_id', ids)
      : { data: [] }
    const lineOf = (id) => (fighters || []).filter(f => f.user_id === id).sort((a, b) => a.slot - b.slot)
    // copies, so a change made by a database function always redraws
    const mine = lineOf(me.user_id).map(f => ({ ...f }))
    const level = squadLevel(mine)
    const rivals = (players || []).filter(p => p.user_id !== me.user_id)
      .map(p => ({ ...p, line: lineOf(p.user_id) })).filter(p => p.line.length === SQUAD_SIZE)
      .map(p => ({ ...p, level: squadLevel(p.line) }))
      .sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level))
    const today = new Date().toISOString().slice(0, 10)
    setData({
      failed: !!failed, tactic: squad?.tactic, mine, level, rivals,
      left: fightsLeft(squad, today),
      credits: creditsOf(ranks?.all_time_points, squad),
      extras: EXTRA_PER_WEEK - (squad?.week === weekOf() ? squad.extras : 0),
      fought: squad?.day === today && squad.fights > 0,
      chars: Object.fromEntries((chars || []).map(c => [c.character_id, c])),
    })
  }

  useEffect(() => { load() }, [])

  const act = async (name, args, done) => {
    setBusy(true); setError('')
    const { error } = await supabase.rpc(name, args)
    if (error) setError(error.message)
    else done?.()
    await load()
    setBusy(false)
  }

  const fight = async (rival, ranked) => {
    setBusy(true); setError('')
    const { data: result, error } = await supabase.rpc('squad_battle', { p_opponent: rival.user_id, p_ranked: ranked })
    if (error) { setBusy(false); return setError(error.message) }
    const ids = [...result.a.fighters, ...result.b.fighters].map(f => f.character_id)
    const { data: chars } = await supabase.from('characters').select('character_id, name, image_url, power_type').in('character_id', ids)
    setBattle({ result, rival: rival.username, chars: Object.fromEntries(chars.map(c => [c.character_id, c])) })
    setBusy(false)
  }

  if (!data) return <PageSkeleton variant="list" />

  const { mine, chars, rivals, left, level, credits, extras } = data
  const alert = error && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-3" style={{ color: 'var(--spot-text)' }}>{error}</p>

  if (data.failed) return (
    <Screen nav="squad" width="max-w-5xl">
      <PageHead title="My Squad" />
      <Empty>Squads can only be tried in the demo for now.</Empty>
    </Screen>
  )

  const steps = (
    <ol aria-label="How it works" className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-[3px] bg-[var(--line)] border-[3px] border-[var(--line)] mb-3">
      {STEPS.map(([title, text], i) => (
        <li key={title} className="bg-[var(--panel)] px-2 sm:px-3 py-2 min-w-0">
          <p className="poster text-base sm:text-xl"><span style={{ color: 'var(--spot-text)' }}>{i + 1}</span> {title}</p>
          <p className="muted text-[0.6875rem] sm:text-xs leading-snug mt-1">{text}</p>
        </li>
      ))}
    </ol>
  )

  if (!mine.length) {
    const toggle = (c) => setPicked(list => list.some(p => p.character_id === c.character_id)
      ? list.filter(p => p.character_id !== c.character_id)
      : list.length < SQUAD_SIZE ? [...list, c] : list)
    return (
      <Screen nav="squad" width="max-w-5xl">
        <PageHead title="My Squad" sub="Everyone starts equally strong. You decide how they grow." />
        {steps}
        {alert}
        <FighterPicker picked={picked.map(p => p.character_id)} onPick={toggle} />
        <div className="box sticky bottom-[5rem] md:bottom-3 z-10 flex items-center gap-3 p-3 mt-3">
          <p className="flex-1 min-w-0 text-sm font-semibold" role="status">
            {picked.length ? picked.map(p => p.name).join(', ') : 'Tap three characters. The first one fights first.'}
          </p>
          <button onClick={() => act('squad_create', { p_characters: picked.map(p => p.character_id) }, () => window.scrollTo(0, 0))}
            disabled={busy || picked.length < SQUAD_SIZE} className="btn-spot text-lg px-4 py-3 flex-shrink-0">
            {picked.length < SQUAD_SIZE ? `${picked.length} / ${SQUAD_SIZE}` : 'Start'}
          </button>
        </div>
      </Screen>
    )
  }

  const tactic = TACTICS.find(t => t.id === data.tactic)
  const selected = mine.find(f => f.character_id === open)

  return (
    <Screen nav="squad" width="max-w-5xl">
      <PageHead title="My Squad" sub={`Level ${level} · ${left} XP ${left === 1 ? 'battle' : 'battles'} left today`}
        aside={isDemo() && data.fought && (
          <button disabled={busy} onClick={() => act('squad_new_day', {})} className="btn text-sm px-3 py-2">New day (demo)</button>
        )} />
      {steps}
      {alert}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-3">
          <ul className="grid grid-cols-3 gap-2">
            {mine.map(f => {
              const c = chars[f.character_id]
              const need = xpToNext(f.level)
              return (
                <li key={f.character_id} className="min-w-0">
                  <button onClick={() => { setError(''); setOpen(f.character_id) }} className="hov-card box w-full h-full text-left flex flex-col relative">
                    <span className="art relative block overflow-hidden">
                      <img src={c?.image_url} alt="" className="block w-full aspect-[3/4] object-cover object-top" />
                      <span className="tag poster left-0 top-0 text-base">{['1st', '2nd', '3rd'][f.slot - 1]}</span>
                      <span className="tag poster right-0 bottom-0 text-xl">Lv {f.level}</span>
                    </span>
                    <span className="block p-2 flex-1">
                      <span className="poster text-base sm:text-xl line-clamp-2 break-words">{c?.name}</span>
                      <span className="block h-2 mt-1.5 bg-[color-mix(in_oklab,var(--ink)_15%,transparent)]" aria-hidden="true">
                        <span className="block h-full bg-[var(--spot)]" style={{ width: `${f.level < MAX_LEVEL ? f.xp / need * 100 : 100}%` }} />
                      </span>
                      <span className="label muted block !text-[0.5625rem] mt-1">{f.level < MAX_LEVEL ? `${f.xp} / ${need} XP` : 'Top level'}</span>
                    </span>
                    <span className={`poster block text-center text-sm sm:text-base py-2 ${f.points ? 'bg-[var(--spot)] text-white' : 'muted border-t-2 border-current/25'}`}>
                      {f.points ? `Spend ${f.points}` : 'Stats'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <Panel i={1} pageClass="flex flex-col">
            <Caption>Tactic</Caption>
            <div className="p-3">
              <div role="group" aria-label="Tactic" className="grid grid-cols-3 gap-2">
                {TACTICS.map(t => (
                  <button key={t.id} disabled={busy} aria-pressed={data.tactic === t.id} onClick={() => act('squad_tactic', { p_tactic: t.id })} className="btn text-lg py-2.5">{t.name}</button>
                ))}
              </div>
              <p className="muted text-sm mt-2">{tactic?.hint} Rivals don&apos;t see it until the fight.</p>
            </div>
          </Panel>

          <Panel i={2} pageClass="flex flex-col">
            <Caption aside={`${DAILY_FIGHTS} free battles a day`}>Credits</Caption>
            <div className="p-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
              <p className="poster text-5xl">{credits}<span className="sr-only"> credits</span></p>
              <p className="muted text-sm">Your <button onClick={() => router.push('/lineup')} className="underline font-semibold text-[var(--ink)]">lineup</button> earns one for every point on battle night. They can&apos;t buy stats or levels.</p>
              <button onClick={() => act('squad_buy_battle', {})} disabled={busy || extras < 1 || credits < PRICES.extra} className="btn text-base py-3 col-span-2">
                +1 XP battle today · {PRICES.extra} credits
              </button>
              <p className="label muted !whitespace-normal col-span-2">{extras} of {EXTRA_PER_WEEK} left this week · reset a fighter&apos;s points from their card for {PRICES.reset}</p>
            </div>
          </Panel>
        </div>

        <Panel i={3} pageClass="flex flex-col">
          <Caption aside="Closest level first">Opponents</Caption>
          <ul className="divide-y-[3px] divide-[var(--line)] border-t-[3px] border-[var(--line)] mt-2">
            {rivals.map(p => (
              <li key={p.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                <div className="flex-1 min-w-[8rem]">
                  <p className="poster text-xl break-words">{p.username}</p>
                  <p className="label muted mt-1">Lv {p.level}{p.guild_tag ? ` · ${p.guild_tag}` : ''}</p>
                </div>
                <ul className="flex gap-1">
                  {p.line.map(f => (
                    <li key={f.character_id}><img src={chars[f.character_id]?.image_url} alt={chars[f.character_id]?.name} title={chars[f.character_id]?.name} loading="lazy" className="w-9 h-11 object-cover object-top border-2 border-[var(--line)]" /></li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <button onClick={() => fight(p, false)} disabled={busy} aria-label={`Spar with ${p.username}`} className="btn text-base px-3 py-2.5">Spar</button>
                  <button onClick={() => fight(p, true)} disabled={busy || left < 1} aria-label={`Battle ${p.username} for XP`} className="btn-spot text-base px-3 py-2.5">Battle</button>
                </div>
              </li>
            ))}
          </ul>
          {!rivals.length && <p className="muted text-sm p-4">No other squads yet.</p>}
        </Panel>
      </div>

      {selected && (
        <FighterSheet key={selected.character_id} fighter={selected} credits={credits} character={chars[selected.character_id]} taken={mine.map(f => f.character_id)}
          error={error} busy={busy} act={act} onClose={() => { setError(''); setOpen(null) }} />
      )}
      {battle && (
        <Arena {...battle} onClose={() => { setBattle(null); load() }}
          onSpend={async (id) => { await load(); setBattle(null); setError(''); setOpen(id) }} />
      )}
    </Screen>
  )
}
