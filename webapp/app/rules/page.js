'use client'
import { useRouter } from 'next/navigation'
import BottomNav from '../../components/BottomNav'
import { BEATS, BUDGET, DRAW_POINTS, MEDIC_BOOST, POWER_COLORS, RANKS, SLOT_DEFS, formatGold } from '../../lib/game'

function Section({ title, i, children }) {
  return (
    <section style={{ '--i': i }} className="enter bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="text-white font-semibold mb-3">{title}</h2>
      {children}
    </section>
  )
}

export default function Rules() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-6 enter">
        <button onClick={() => router.back()} className="text-zinc-500 text-sm mb-3 block">← Back</button>
        <h1 className="text-2xl font-bold tracking-tight">How to play</h1>
        <p className="text-zinc-500 text-sm mt-1">Rise. Battle. Become Legend.</p>
      </div>

      <div className="px-5 flex flex-col gap-4 text-sm text-zinc-400 leading-relaxed">
        <Section i={1} title="1. Build your party">
          <p>
            You have <span className="text-amber-400 font-semibold">{formatGold(BUDGET)} gold</span>{' '}to sign 10 characters.
            Stronger characters cost more, so a party of only stars won&apos;t fit.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {SLOT_DEFS.map(d => (
              <div key={d.type} className="flex items-center justify-between">
                <span className={`${d.color} font-medium`}>{d.count} × {d.type}</span>
                <span className="text-zinc-500 tabular-nums">{d.points} pts per win</span>
              </div>
            ))}
          </div>
        </Section>

        <Section i={2} title="2. Battle night">
          <p>
            Every Thursday all characters are paired at random. Each fight is decided by overall rating,
            power type and a bit of luck, so upsets happen.
          </p>
          <p className="mt-3">
            A win scores your slot&apos;s points, a draw scores {DRAW_POINTS}, a loss scores nothing.
            If your <span className="text-green-400">Medic</span> wins, every other winner in your party scores ×{MEDIC_BOOST}.
          </p>
        </Section>

        <Section i={3} title="3. Power types">
          <p className="mb-4">Each type has an edge over the next one in the circle.</p>
          <div className="flex flex-col gap-2">
            {Object.entries(BEATS).map(([t, beats]) => (
              <p key={t}>
                <span className={POWER_COLORS[t]}>{t}</span>
                <span className="text-zinc-600"> beats </span>
                <span className={POWER_COLORS[beats]}>{beats}</span>
              </p>
            ))}
          </div>
        </Section>

        <Section i={4} title="4. Climb the ranks">
          <div className="flex flex-col gap-2">
            {RANKS.map(r => (
              <div key={r.name} className="flex items-center justify-between">
                <span className={`${r.color} font-medium`}>{r.name}</span>
                <span className="text-zinc-500 tabular-nums">{r.min}+ season pts</span>
              </div>
            ))}
          </div>
          <p className="mt-4">Reach Legendary once and you keep the ⚡ Legend badge for good.</p>
        </Section>
      </div>

      <BottomNav active="rules" />
    </div>
  )
}
