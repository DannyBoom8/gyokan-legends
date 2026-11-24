'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'
import PageSkeleton from '../../components/Skeleton'
import { nextBattle, POWER_HEX } from '../../lib/game'
import Icon from '../../components/Icon'

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

  const side = (c, dir) => {
    const won = result?.winner_id === c?.character_id
    const lost = result && !won && !isDraw
    const tc = POWER_HEX[c?.power_type] || '#71717a'
    return (
      <button onClick={() => onOpen(c?.character_id)} style={{ '--tc': tc }}
        className={`${dir} press flex-1 min-w-0 flex flex-col items-center gap-2 ${lost ? 'opacity-50 grayscale' : ''}`}>
        <span className="cut-sm p-[3px] relative" style={{ background: `linear-gradient(160deg, ${tc}, ${tc}22)` }}>
          <img src={c?.image_url} alt="" className={`cut-sm w-[72px] h-[72px] object-cover object-top bg-zinc-800 ${mine.has(c?.character_id) ? 'outline outline-2 outline-amber-500 -outline-offset-2' : ''}`} />
          {won && <span className="shine" />}
        </span>
        <span className="display text-[13px] uppercase leading-tight text-center line-clamp-2">{c?.name}</span>
        <span className="label !text-[0.6875rem]" style={{ color: tc }}>{c?.power_type} · {c?.overall}</span>
        <span className={`stamp stamp-in display h-[18px] leading-[18px] px-2 text-[12px] tracking-[0.16em] uppercase bg-amber-400 text-on-accent ${won ? '' : 'invisible'}`}>Victory</span>
      </button>
    )
  }

  const ta = POWER_HEX[fixture.char_a?.power_type] || '#71717a'
  const tb = POWER_HEX[fixture.char_b?.power_type] || '#71717a'
  return (
    <div className="enter" style={{ '--i': Math.min(index, 6) + 1 }}>
      <div className="frame cut" style={{ '--frame': myWin ? 'rgb(245 158 11 / 0.6)' : undefined }}>
        <div className="inner cut relative flex items-center gap-1 px-3.5 py-5"
          style={{ background: `linear-gradient(90deg, ${ta}26, var(--color-zinc-950) 42% 58%, ${tb}26)` }}>
          <span aria-hidden="true" className="absolute left-1/2 -top-[10%] -bottom-[10%] w-0.5 -skew-x-[18deg] bg-gradient-to-b from-transparent via-amber-500/40 to-transparent" />
          {side(fixture.char_a, 'slide-l')}
          <div className="vs-pop w-[52px] flex-shrink-0 text-center relative">
            {isDraw
              ? <span className="display text-sm text-zinc-500">DRAW</span>
              : <span className="display italic text-[26px] leading-none text-amber-500 inline-block -skew-x-[8deg]" style={{ textShadow: '0 0 18px rgb(245 158 11 / 0.5)' }}>VS</span>}
          </div>
          {side(fixture.char_b, 'slide-r')}
        </div>
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

  if (loading) return <PageSkeleton variant="list" />

  const open = (cid) => cid && router.push(`/character?id=${cid}`)
  const battle = nextBattle()
  const myWins = myFixtures.filter(f => mine.has(one(f.results)?.winner_id)).length

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12"><div className="md:max-w-6xl md:mx-auto">
      <div className="px-5 md:px-8 pt-14 pb-6 enter">
        <h1 className="display text-3xl md:text-4xl uppercase">Battles</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {gameweek
            ? `Gameweek ${gameweek.gameweek_number} · ${new Date(gameweek.battle_date).toDateString()}`
            : 'Battles happen every Thursday'
          }
        </p>
      </div>

      {!gameweek ? (
        <div className="flex flex-col items-center justify-center py-20 px-5">
          <div className="text-amber-500 mb-5"><Icon name="swords" size={56} className="icon-in icon-float" /></div>
          <h2 className="display text-xl mb-2">No battles yet</h2>
          <p className="text-zinc-500 text-sm text-center leading-relaxed">
            Every Thursday all characters are paired at random and fight. Build your party and come back then.
          </p>
          <div className="mt-6 w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 label mb-2">Next battle night</p>
            <p className="display text-xl">
              {battle.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 md:px-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3 enter" style={{ '--i': 1 }}>
          {myFixtures.length > 0 && (
            <>
              <div className="flex items-baseline justify-between md:col-span-full">
                <p className="label text-amber-500">Your fighters</p>
                <p className="label text-zinc-500 !tracking-[0.08em]">{myWins} / {myFixtures.length} won</p>
              </div>
              {myFixtures.map((f, i) => <Fixture key={f.fixture_id} index={i} fixture={f} mine={mine} onOpen={open} />)}
            </>
          )}
          {mine.size === 0 && (
            <button onClick={() => router.push('/party')}
              className="press bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-left">
              <p className="display text-amber-400 text-base">You had no fighters this week</p>
              <p className="text-zinc-500 text-sm mt-1">Build your party before Thursday to score</p>
            </button>
          )}
          <p className="text-zinc-500 label mt-3 md:col-span-full">Around the arena</p>
          {otherFixtures.map((f, i) => <Fixture key={f.fixture_id} index={i} fixture={f} mine={mine} onOpen={open} />)}
        </div>
      )}

      </div>
      <BottomNav active="battles" />
    </div>
  )
}
