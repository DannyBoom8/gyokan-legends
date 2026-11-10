'use client'
import { useRouter } from 'next/navigation'
import Icon from '../../components/Icon'
import BottomNav from '../../components/BottomNav'
import { GAMES } from '../../lib/games'

export default function Games() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-6 max-w-3xl mx-auto enter">
        <p className="label text-zinc-500 mb-2">Gyokan</p>
        <h1 className="display text-3xl">Games</h1>
        <p className="text-zinc-500 text-sm mt-2">Play solo or with friends. No account needed.</p>
      </div>

      <div className="px-5 max-w-3xl mx-auto flex flex-col gap-3">
        <button onClick={() => router.push('/')} style={{ '--i': 1 }}
          className="enter tile press text-left rounded-[24px] border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-500/0 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="label text-amber-500 mb-1.5">Season game · Account</p>
              <p className="display text-xl">Gyokan Legends</p>
              <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                Draft 10 anime legends with 100M gold. Every Thursday they battle for points and rank.
              </p>
            </div>
            <div className="tile-icon text-amber-500 shrink-0"><Icon name="dragon" size={40} className="icon-in icon-glow" /></div>
          </div>
        </button>

        <div className="grid sm:grid-cols-2 gap-3">
          {GAMES.map((g, i) => (
            <button key={g.slug} onClick={() => router.push(`/games/${g.slug}`)} style={{ '--i': i + 2 }}
              className="enter tile press text-left rounded-[24px] border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="display text-base">{g.title}</p>
                <div className="tile-icon text-amber-500 shrink-0"><Icon name={g.icon} size={26} className="icon-in" style={{ '--i': i + 2 }} /></div>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">{g.blurb}</p>
              <p className="label text-zinc-500 mt-3">{g.tag}</p>
            </button>
          ))}
        </div>
      </div>

      <BottomNav active="games" />
    </div>
  )
}
