'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import PageSkeleton from '../../components/Skeleton'
import { nextBattle, POWER_HEX } from '../../lib/game'
import Icon from '../../components/Icon'
import { Screen, PageHead, Panel } from '../../components/Manga'

const FIXTURE_FIELDS = `
  fixture_id,
  char_a:character_a_id(character_id, name, image_url, power_type, overall),
  char_b:character_b_id(character_id, name, image_url, power_type, overall),
  results(winner_id, was_draw)
`

// PostgREST returns a one-to-one embed as an object, older setups as an array
const one = (r) => Array.isArray(r) ? r[0] : r

function Fixture({ fixture, mine, onOpen, index = 0 }) {
  const result = one(fixture.results)
  const isDraw = result?.was_draw
  const hasMine = mine.has(fixture.char_a?.character_id) || mine.has(fixture.char_b?.character_id)
  const myWin = result && !isDraw && mine.has(result.winner_id)

  // two halves of one panel, cut apart by a slanted gutter
  const side = (c, half) => {
    const won = result?.winner_id === c?.character_id
    const lost = result && !won && !isDraw
    return (
      <button onClick={() => onOpen(c?.character_id)}
        aria-label={`${c?.name}, ${c?.power_type}, rated ${c?.overall}${won ? ', winner' : ''}${mine.has(c?.character_id) ? ', your fighter' : ''}`}
        className={`art fx-${half} relative block h-52 overflow-hidden bg-[var(--panel)]`}>
        <img src={c?.image_url} alt="" loading="lazy" className={`absolute inset-0 w-full h-full object-cover object-top ${lost ? 'brightness-50' : ''}`} />
        <span className={`absolute top-0 flex flex-col ${half === 'a' ? 'left-0 items-start' : 'right-0 items-end'}`}>
          {won && <span className="poster text-base bg-[var(--spot)] text-white px-2.5 py-1">Victory</span>}
          {mine.has(c?.character_id) && <span className="label !text-[0.625rem] bg-[var(--ink)] text-[var(--paper)] px-2 py-1">Yours</span>}
        </span>
        <span className={`absolute inset-x-0 bottom-0 bg-[var(--ink)] text-[var(--paper)] py-2 ${half === 'a' ? 'text-left pl-2.5 pr-9' : 'text-right pl-9 pr-2.5'}`}>
          <span className="poster block text-base truncate">{c?.name}</span>
          <span className="label !text-[0.625rem] block truncate mt-1">
            <span className="inline-block w-2 h-2 mr-1.5" style={{ background: POWER_HEX[c?.power_type] || '#71717a' }} />
            {c?.power_type} · {c?.overall}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="arrive" style={{ '--i': Math.min(index, 6) + 1 }}>
      <div className={`hov-card relative grid grid-cols-2 bg-[var(--line)] border-[3px] ${myWin ? 'border-[var(--spot)]' : 'border-[var(--line)]'}`}>
        {side(fixture.char_a, 'a')}
        {side(fixture.char_b, 'b')}
        <span className="vs poster pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 -rotate-6 bg-[var(--spot)] text-white border-2 border-white text-2xl px-2.5 py-1.5">
          {isDraw ? 'Draw' : 'VS'}
        </span>
      </div>
    </div>
  )
}

export default function Battles() {
  const [loading, setLoading] = useState(true)
  const [myFixtures, setMyFixtures] = useState([])
  const [otherFixtures, setOtherFixtures] = useState([])
  const [mine, setMine] = useState(new Set())
  const [gameweek, setGameweek] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const [{ data: gw }, { data: party }] = await Promise.all([
        supabase.from('gameweeks').select('*').order('gameweek_id', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('parties').select('id').eq('user_id', session.user.id).maybeSingle(),
      ])

      const { data: slots } = party
        ? await supabase.from('party_slots').select('character_id').eq('party_id', party.id)
        : { data: [] }
      const ids = (slots || []).map(s => s.character_id)
      setMine(new Set(ids))

      if (gw) {
        setGameweek(gw)
        const list = ids.join(',')
        const [{ data: my }, { data: others }] = await Promise.all([
          ids.length
            ? supabase.from('fixtures').select(FIXTURE_FIELDS).eq('gameweek_id', gw.gameweek_id)
                .or(`character_a_id.in.(${list}),character_b_id.in.(${list})`)
            : { data: [] },
          supabase.from('fixtures').select(FIXTURE_FIELDS).eq('gameweek_id', gw.gameweek_id)
            .order('fixture_id').limit(40),
        ])
        const myIds = new Set((my || []).map(f => f.fixture_id))
        setMyFixtures(my || [])
        setOtherFixtures((others || []).filter(f => !myIds.has(f.fixture_id)))
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageSkeleton nav="battles" title="Results" />

  const open = (cid) => cid && router.push(`/character?id=${cid}`)
  const battle = nextBattle()
  const myWins = myFixtures.filter(f => mine.has(one(f.results)?.winner_id)).length

  return (
    <Screen nav="battles">
      <PageHead title="Results" sub={gameweek
        ? `Gameweek ${gameweek.gameweek_number} · ${new Date(gameweek.battle_date).toDateString()}`
        : 'Battles happen every Thursday'} />

      {!gameweek ? (
        <Panel i={1} className="max-w-xl mx-auto" pageClass="flex flex-col items-center text-center py-12 px-5">
          <div className="tone absolute -z-10 inset-0" aria-hidden="true" />
          <Icon name="swords" size={56} />
          <h2 className="poster text-3xl mt-5 mb-3">No battles yet</h2>
          <p className="muted text-sm leading-relaxed max-w-xs">
            Every Thursday all characters are paired at random and fight. Build your lineup and come back then.
          </p>
          <p className="label muted mt-8 mb-2">Next battle night</p>
          <p className="poster text-2xl">
            {battle.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          </p>
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {myFixtures.length > 0 && (
            <>
              <div className="flex items-center justify-between md:col-span-full">
                <h2 className="caption poster text-xl">Your fighters</h2>
                <p className="label muted">{myWins} / {myFixtures.length} won</p>
              </div>
              {myFixtures.map((f, i) => <Fixture key={f.fixture_id} index={i} fixture={f} mine={mine} onOpen={open} />)}
            </>
          )}
          {mine.size === 0 && (
            <button onClick={() => router.push('/lineup')} className="box toc hov press p-4 text-left md:col-span-full">
              <span className="poster block text-xl" style={{ color: 'var(--spot-text)' }}>You had no fighters this week</span>
              <span className="block muted text-sm mt-1.5">Build your lineup before Thursday to score</span>
            </button>
          )}
          <div className="mt-3 md:col-span-full"><h2 className="caption poster text-xl">Around the arena</h2></div>
          {otherFixtures.map((f, i) => <Fixture key={f.fixture_id} index={i} fixture={f} mine={mine} onOpen={open} />)}
        </div>
      )}
    </Screen>
  )
}
