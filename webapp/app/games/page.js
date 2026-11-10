'use client'
import { useRouter } from 'next/navigation'
import BottomNav from '../../components/BottomNav'
import { GAMES } from '../../lib/games'

export default function Games() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-6 max-w-3xl mx-auto enter">
        <p className="text-zinc-600 text-xs tracking-widest uppercase mb-1">Gyokan</p>
        <h1 className="text-2xl font-bold tracking-tight">Games</h1>
        <p className="text-zinc-500 text-sm mt-1">Anime games to play solo or with friends. No account needed.</p>
      </div>

      <div className="px-5 max-w-3xl mx-auto flex flex-col gap-3">
        <button onClick={() => router.push('/')} style={{ '--i': 1 }}
          className="enter press text-left rounded-[24px] border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-500/0 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-amber-500 text-xs uppercase tracking-wider mb-1">Season game · Account</p>
              <p className="text-white font-bold text-lg">Gyokan Legends</p>
              <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                Draft 10 anime legends with 100M gold. Every Thursday they battle for points and rank.
              </p>
            </div>
            <span className="text-4xl" aria-hidden>🐉</span>
          </div>
        </button>

        <div className="grid sm:grid-cols-2 gap-3">
          {GAMES.map((g, i) => (
            <button key={g.slug} onClick={() => router.push(`/games/${g.slug}`)} style={{ '--i': i + 2 }}
              className="enter press text-left rounded-[24px] border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-white font-semibold">{g.title}</p>
                <span className="text-2xl" aria-hidden>{g.emoji}</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">{g.blurb}</p>
              <p className="text-zinc-600 text-xs mt-3">{g.tag}</p>
            </button>
          ))}
        </div>
      </div>

      <BottomNav active="games" />
    </div>
  )
}
