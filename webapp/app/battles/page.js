'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

export default function Battles() {
  const [loading, setLoading] = useState(true)
  const [fixtures, setFixtures] = useState([])
  const [gameweek, setGameweek] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const { data: gw } = await supabase
        .from('gameweeks')
        .select('*')
        .order('gameweek_id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (gw) {
        setGameweek(gw)
        const { data: fixtureData } = await supabase
          .from('fixtures')
          .select(`
            fixture_id,
            char_a:character_a_id(character_id, name, image_url),
            char_b:character_b_id(character_id, name, image_url),
            results(winner_id, was_draw)
          `)
          .eq('gameweek_id', gw.gameweek_id)
          .limit(100)
        setFixtures(fixtureData || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-amber-500 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-6">
        <h1 className="text-2xl font-bold">Battles</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {gameweek
            ? `Gameweek ${gameweek.gameweek_number} · ${new Date(gameweek.battle_date).toDateString()}`
            : 'Battles happen every Thursday'
          }
        </p>
      </div>

      {fixtures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-5">
          <div className="text-6xl mb-5">⚔️</div>
          <h2 className="text-white font-bold text-lg mb-2">No battles yet</h2>
          <p className="text-zinc-500 text-sm text-center leading-relaxed">
            Battles are generated and simulated every Thursday. Build your party and come back then.
          </p>
          <div className="mt-6 w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Next battle window</p>
            <p className="text-white font-bold text-lg">Thursday</p>
            <p className="text-zinc-600 text-xs mt-1">All active characters are paired randomly</p>
          </div>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-3">
          {fixtures.map(fixture => {
            const result = fixture.results?.[0]
            const aWon = result?.winner_id === fixture.char_a?.character_id
            const bWon = result?.winner_id === fixture.char_b?.character_id
            const isDraw = result?.was_draw
            const pending = !result

            return (
              <div key={fixture.fixture_id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <div className={`flex-1 flex flex-col items-center gap-2 transition-opacity ${result && !aWon && !isDraw ? 'opacity-30' : ''}`}>
                    <img src={fixture.char_a?.image_url} alt={fixture.char_a?.name}
                      className="w-14 h-14 rounded-xl object-cover bg-zinc-800" />
                    <p className="text-white text-xs font-medium text-center leading-tight line-clamp-2 max-w-[90px]">
                      {fixture.char_a?.name}
                    </p>
                    {aWon && <span className="text-amber-400 text-xs font-bold">WIN</span>}
                  </div>

                  <div className="flex flex-col items-center gap-1 px-2">
                    <span className="text-zinc-600 text-xs font-bold">VS</span>
                    {isDraw && <span className="text-zinc-400 text-xs font-medium">DRAW</span>}
                    {pending && <span className="text-zinc-700 text-xs">—</span>}
                  </div>

                  <div className={`flex-1 flex flex-col items-center gap-2 transition-opacity ${result && !bWon && !isDraw ? 'opacity-30' : ''}`}>
                    <img src={fixture.char_b?.image_url} alt={fixture.char_b?.name}
                      className="w-14 h-14 rounded-xl object-cover bg-zinc-800" />
                    <p className="text-white text-xs font-medium text-center leading-tight line-clamp-2 max-w-[90px]">
                      {fixture.char_b?.name}
                    </p>
                    {bWon && <span className="text-amber-400 text-xs font-bold">WIN</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BottomNav active="battles" />
    </div>
  )
}