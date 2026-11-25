'use client'
import { BEATS, BUDGET, DRAW_POINTS, MEDIC_BOOST, POWER_COLORS, RANKS, SLOT_DEFS, formatGold } from '../../lib/game'
import { Screen, PageHead, Panel, Caption } from '../../components/Manga'

function Section({ title, i, children }) {
  return (
    <Panel i={i} className="hov" pageClass="flex flex-col">
      <Caption>{title}</Caption>
      <div className="p-4 md:p-5">{children}</div>
    </Panel>
  )
}

export default function Rules() {
  return (
    <Screen nav="rules">
      <PageHead title="How to play" sub="Rise. Battle. Become Legend." back />

      <div className="grid gap-3 md:grid-cols-2 text-[0.9375rem] leading-relaxed">
        <Section i={1} title="1. Build your party">
          <p>
            You have <span className="font-bold">{formatGold(BUDGET)} gold</span>{' '}to sign 10 characters.
            Stronger characters cost more, so a party of only stars won&apos;t fit.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {SLOT_DEFS.map(d => (
              <div key={d.type} className="flex items-center justify-between">
                <span className={`${d.color} display text-base`}>{d.count} × {d.type}</span>
                <span className="label text-zinc-500">{d.points} pts per win</span>
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
                <span className="text-zinc-500"> beats </span>
                <span className={POWER_COLORS[beats]}>{beats}</span>
              </p>
            ))}
          </div>
        </Section>

        <Section i={4} title="4. Climb the ranks">
          <div className="flex flex-col gap-2">
            {RANKS.map(r => (
              <div key={r.name} className="flex items-center justify-between">
                <span className={`${r.color} display text-base`}>{r.name}</span>
                <span className="label text-zinc-500">{r.min}+ season pts</span>
              </div>
            ))}
          </div>
          <p className="mt-4">Reach Legendary once and you keep the Legend badge for good.</p>
        </Section>
      </div>
    </Screen>
  )
}
