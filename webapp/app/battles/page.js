'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'
import { nextBattle } from '../../lib/game'

const FIXTURE_FIELDS = `
  fixture_id,
  char_a:character_a_id(character_id, name, image_url, power_type, overall),
  char_b:character_b_id(character_id, name, image_url, power_type, overall),
  results(winner_id, was_draw)
`

// PostgREST returns a one-to-one embed as an object, older setups as an array
const one = (r) => Array.isArray(r) ? r[0] : r

function Fixture({ fixture, mine, onOpen }) {
  const result = one(fixture.results)
  const isDraw = result?.was_draw

  const side = (c) => {
    const won = result?.winner_id === c?.character_id
    const faded = result && !won && !isDraw
    return (
      <button onClick={() => onOpen(c?.character_id)}
        className={`press flex-1 flex flex-col items-center gap-2 ${faded ? 'opacity-30' : ''}`}>
        <img src={c?.image_url} alt={c?.name}
          className={`w-14 h-14 rounded-xl object-cover bg-zinc-800 ${mine.has(c?.character_id) ? 'ring-2 ring-amber-500' : ''}`} />
        <p className="text-white text-xs font-medium text-center leading-tight line-clamp-2 max-w-[90px]">{c?.name}</p>
        <p className="text-zinc-600 text-[10px]">{c?.power_type} · {c?.overall}</p>
        {won && <span className="text-amber-400 text-xs font-bold">WIN</span>}
      </button>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-4">
      <div className="flex items-center gap-2">
        {side(fixture.char_a)}
        <div className="flex flex-col items-center gap-1 px-2">
          <span className="text-zinc-600 text-xs font-bold">VS</span>
          {isDraw && <span className="text-zinc-400 text-xs font-medium">DRAW</span>}
          {!result && <span className="text-zinc-700 text-xs">—</span>}
        </div>
        {side(fixture.char_b)}
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

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-amber-500 text-sm fade-in-late">Loading...</p>
    </div>
  )

  const open = (cid) => cid && router.push(`/character?id=${cid}`)
  const battle = nextBattle()
  const myWins = myFixtures.filter(f => mine.has(one(f.results)?.winner_id)).length

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-6 enter">
        <h1 className="text-2xl font-bold tracking-tight">Battles</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {gameweek
            ? `Gameweek ${gameweek.gameweek_number} · ${new Date(gameweek.battle_date).toDateString()}`
            : 'Battles happen every Thursday'
          }
        </p>
      </div>

      {!gameweek ? (
        <div className="flex flex-col items-center justify-center py-20 px-5">
          <div className="text-6xl mb-5">⚔️</div>
          <h2 className="text-white font-bold text-lg mb-2">No battles yet</h2>
          <p className="text-zinc-500 text-sm text-center leading-relaxed">
            Every Thursday all characters are paired at random and fight. Build your party and come back then.
          </p>
          <div className="mt-6 w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Next battle night</p>
            <p className="text-white font-bold text-lg">
              {battle.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-3 enter" style={{ '--i': 1 }}>
          {myFixtures.length > 0 && (
            <>
              <div className="flex items-baseline justify-between">
                <p className="text-amber-500 text-xs uppercase tracking-wider">Your fighters</p>
                <p className="text-zinc-500 text-xs">{myWins} / {myFixtures.length} won</p>
              </div>
              {myFixtures.map(f => <Fixture key={f.fixture_id} fixture={f} mine={mine} onOpen={open} />)}
            </>
          )}
          {mine.size === 0 && (
            <button onClick={() => router.push('/party')}
              className="press bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-left">
              <p className="text-amber-400 text-sm font-semibold">You had no fighters this week</p>
              <p className="text-zinc-500 text-xs mt-1">Build your party before Thursday to score →</p>
            </button>
          )}
          <p className="text-zinc-500 text-xs uppercase tracking-wider mt-3">Around the arena</p>
          {otherFixtures.map(f => <Fixture key={f.fixture_id} fixture={f} mine={mine} onOpen={open} />)}
        </div>
      )}

      <BottomNav active="battles" />
    </div>
  )
}
