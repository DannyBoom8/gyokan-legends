'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import BottomNav from '../../../components/BottomNav'
import { BEATS, POWER_BADGES, STATS, formatGold } from '../../../lib/game'

// PostgREST returns a one-to-one embed as an object, older setups as an array
const one = (r) => Array.isArray(r) ? r[0] : r

export default function CharacterProfile() {
  const { id } = useParams()
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

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-amber-500 text-sm">Loading...</p>
    </div>
  )

  if (!char) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-500 text-sm">Character not found</p>
      <button onClick={() => router.back()} className="text-amber-500 text-sm">← Go back</button>
    </div>
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
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="relative h-72 overflow-hidden">
        <img src={char.image_url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black" />
        <button onClick={() => router.back()} className="absolute top-12 left-5 text-zinc-300 text-sm bg-black/40 rounded-full px-3 py-1.5">
          ← Back
        </button>
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex items-end gap-4">
          <img src={char.image_url} alt={char.name} className="w-28 h-36 rounded-2xl object-cover border border-white/10 shadow-2xl bg-zinc-800" />
          <div className="min-w-0 pb-1">
            <h1 className="text-2xl font-bold leading-tight">{char.name}</h1>
            <p className="text-zinc-400 text-sm truncate">{char.anime_title}</p>
            {char.power_type && (
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${POWER_BADGES[char.power_type]}`}>{char.power_type}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
        {[
          ['Overall', char.overall ?? '—', 'text-white'],
          ['Cost', formatGold(char.gold_cost), 'text-amber-400'],
          ['Record', `${record.W}-${record.D}-${record.L}`, 'text-white'],
        ].map(([label, value, color]) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className={`font-bold text-lg tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mx-5 mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-4">Stats</p>
        <div className="flex flex-col gap-3">
          {STATS.map(s => (
            <div key={s} className="flex items-center gap-3">
              <span className="text-zinc-400 text-xs w-20 capitalize">{s === 'iq' ? 'IQ' : s}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${char[s] || 0}%` }} />
              </div>
              <span className="text-white text-xs w-6 text-right tabular-nums">{char[s] ?? '—'}</span>
            </div>
          ))}
        </div>
        {char.power_type && (
          <p className="text-zinc-500 text-xs mt-5 leading-relaxed">
            Strong against <span className="text-white">{BEATS[char.power_type]}</span> · weak to <span className="text-white">{weakTo}</span>
          </p>
        )}
      </div>

      <div className="mx-5 mt-4">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Recent battles</p>
        {fights.length === 0 ? (
          <p className="text-zinc-600 text-sm">No battles yet. The first one is on Thursday.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fights.slice(0, 5).map(fx => {
              const opp = fx.char_a?.character_id === cid ? fx.char_b : fx.char_a
              const o = outcome(fx)
              return (
                <button key={fx.fixture_id} onClick={() => router.push(`/characters/${opp?.character_id}`)}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3 text-left">
                  <span className={`w-7 text-center font-bold text-sm ${o === 'W' ? 'text-amber-400' : o === 'L' ? 'text-zinc-600' : 'text-zinc-400'}`}>{o}</span>
                  <img src={opp?.image_url} alt="" className="w-9 h-9 rounded-lg object-cover bg-zinc-800" />
                  <p className="flex-1 text-sm text-white truncate">vs {opp?.name}</p>
                  <span className="text-zinc-600 text-xs">GW {one(fx.gameweeks)?.gameweek_number}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav active="characters" />
    </div>
  )
}
