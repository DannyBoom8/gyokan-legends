'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import PageSkeleton from '../../components/Skeleton'
import { BEATS, POWER_HEX, STATS, formatGold } from '../../lib/game'
import { Screen, PageHead, Panel, Caption } from '../../components/Manga'

// PostgREST returns a one-to-one embed as an object, older setups as an array
const one = (r) => Array.isArray(r) ? r[0] : r

// a query param (not /characters/[id]) so the site can be a static export served by a Worker
function CharacterProfile() {
  const id = useSearchParams().get('id')
  const router = useRouter()
  const [char, setChar] = useState(null)
  const [fights, setFights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const cid = parseInt(id)

      const [{ data: c }, { data: f }] = await Promise.all([
        supabase.from('characters').select('*').eq('character_id', cid).maybeSingle(),
        supabase.from('fixtures')
          .select(`fixture_id,
            char_a:character_a_id(character_id, name, image_url),
            char_b:character_b_id(character_id, name, image_url),
            gameweeks(gameweek_number),
            results(winner_id, was_draw)`)
          .or(`character_a_id.eq.${cid},character_b_id.eq.${cid}`)
          .order('fixture_id', { ascending: false })
          .limit(100),
      ])
      setChar(c)
      setFights((f || []).filter(x => one(x.results)))
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <PageSkeleton variant="detail" />

  if (!char) return (
    <Screen nav="characters">
      <PageHead title="Character not found" back />
    </Screen>
  )

  const cid = char.character_id
  const outcome = (fx) => {
    const r = one(fx.results)
    return r.was_draw ? 'D' : r.winner_id === cid ? 'W' : 'L'
  }
  const record = { W: 0, D: 0, L: 0 }
  fights.forEach(fx => { record[outcome(fx)]++ })
  const weakTo = Object.keys(BEATS).find(t => BEATS[t] === char.power_type)

  return (
    <Screen nav="characters">
      <PageHead title={char.name} sub={char.anime_title} back />

      <div className="grid gap-3 lg:grid-cols-12 items-start">
        <Panel i={1} className="hov art lg:col-span-4 w-full max-w-md justify-self-center">
          <img src={char.image_url} alt={char.name} className="block w-full aspect-[3/4] object-cover object-top" />
          {char.power_type && (
            <span className="poster absolute left-0 bottom-0 text-xl bg-[var(--ink)] text-[var(--paper)] px-3 py-2">
              <span className="inline-block w-3 h-3 mr-2" style={{ background: POWER_HEX[char.power_type] }} />{char.power_type}
            </span>
          )}
        </Panel>

        <div className="lg:col-span-8 flex flex-col gap-3">
          <Panel i={2} className="hov" pageClass="p-4">
            <dl className="grid grid-cols-3 divide-x-2 divide-current/25">
              {[['Overall', char.overall ?? '—'], ['Cost', formatGold(char.gold_cost)], ['Record', `${record.W}-${record.D}-${record.L}`]].map(([label, value]) => (
                <div key={label} className="px-3 first:pl-0">
                  <dt className="label muted !text-[0.625rem]">{label}</dt>
                  <dd className="poster text-3xl mt-1.5">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel i={3} className="hov">
            <Caption>Stats</Caption>
            <div className="p-4">
              <div className="flex flex-col gap-3">
                {STATS.map(s => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="label muted w-20">{s === 'iq' ? 'IQ' : s}</span>
                    <div className="flex-1 h-3 bg-zinc-800">
                      <div className="h-full bg-[var(--spot)] bar-fill" style={{ scale: `${(char[s] || 0) / 100} 1` }} />
                    </div>
                    <span className="poster text-lg w-8 text-right">{char[s] ?? '—'}</span>
                  </div>
                ))}
              </div>
              {char.power_type && (
                <p className="muted text-sm mt-5">
                  Strong against <strong className="text-white">{BEATS[char.power_type]}</strong> · weak to <strong className="text-white">{weakTo}</strong>
                </p>
              )}
            </div>
          </Panel>

          <Panel i={4} className="hov">
            <Caption>Recent battles</Caption>
            <div className="px-4 py-2">
              {fights.length === 0 ? (
                <p className="muted text-sm py-2">No battles yet. The first one is on Thursday.</p>
              ) : (
                <ul className="divide-y-2 divide-current/20">
                  {fights.slice(0, 5).map(fx => {
                    const opp = fx.char_a?.character_id === cid ? fx.char_b : fx.char_a
                    const o = outcome(fx)
                    return (
                      <li key={fx.fixture_id}>
                        <button onClick={() => router.push(`/character?id=${opp?.character_id}`)}
                          className="toc hov-row press w-full py-2.5 px-2 flex items-center gap-3 text-left">
                          <span className={`poster w-8 h-8 flex items-center justify-center text-lg ${o === 'W' ? 'bg-[var(--spot)] text-white' : 'border-2 border-current/30 muted'}`}>
                            <span aria-hidden="true">{o}</span><span className="sr-only">{{ W: 'Won', D: 'Drew', L: 'Lost' }[o]}</span>
                          </span>
                          <img src={opp?.image_url} alt="" className="w-11 h-11 object-cover object-top border-2 border-[var(--line)]" />
                          <span className="flex-1 min-w-0 text-sm font-semibold truncate">vs {opp?.name}</span>
                          <span className="label muted">GW {one(fx.gameweeks)?.gameweek_number}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </Screen>
  )
}

export default function CharacterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <CharacterProfile />
    </Suspense>
  )
}
