'use client'
import { useEffect, useRef, useState } from 'react'
import { TACTICS, maxHp } from '../lib/squad'

const SIDES = ['a', 'b']
const other = (side) => side === 'a' ? 'b' : 'a'
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Bar({ value, max, color, label }) {
  return (
    <div className="h-2.5 bg-[color-mix(in_oklab,var(--ink)_15%,transparent)] overflow-hidden" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full w-full origin-left transition-transform duration-200 ease-out" style={{ background: color, transform: `scaleX(${value / max})` }} />
    </div>
  )
}

// plays back a battle that has already been decided
export default function Arena({ result, chars, rival, home, label, onSpend, onClose }) {
  const dialog = useRef(null)
  const art = { a: useRef(null), b: useRef(null) }
  const [step, setStep] = useState(0)
  const [fast, setFast] = useState(false)
  const last = result.events.length - 1
  const ev = result.events[step]
  const done = step === last
  const struck = ev.by && ev.damage ? other(ev.by) : null
  const fighter = (side) => result[side].fighters[ev[side]]
  const name = (side) => chars[fighter(side).character_id]?.name || 'Fighter'

  useEffect(() => { if (!dialog.current.open) dialog.current.showModal() }, [])

  useEffect(() => {
    if (done) return
    const wait = setTimeout(() => setStep(s => s + 1), fast ? 350 : 850)
    return () => clearTimeout(wait)
  }, [step, fast, done])

  // the attacker lunges across the gutter and the one hit shakes
  useEffect(() => {
    if (!struck || still()) return
    const toward = ev.by === 'a' ? 1 : -1
    const timing = { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    art[ev.by].current?.animate([{ translate: '0' }, { translate: `${toward * 22}px 0`, offset: 0.4 }, { translate: '0' }], timing)
    art[struck].current?.animate([0, -7, 6, -3, 0].map(x => ({ translate: `${x}px 0` })), timing)
  }, [step])

  const line = ev.kind === 'enter'
    ? (ev.by ? `${name(ev.by)} steps in` : 'Fight!')
    : ev.kind === 'ko' ? `${name(other(ev.by))} is knocked out`
    : ev.kind === 'special' ? `Special move! ${name(ev.by)} deals ${ev.damage}`
    : ev.kind === 'crit' ? `Critical hit! ${name(ev.by)} deals ${ev.damage}`
    : ev.kind === 'counter' ? `${name(ev.by)} counters for ${ev.damage}`
    : `${name(ev.by)} hits for ${ev.damage}`
  const loud = ev.kind === 'special' || ev.kind === 'crit' || ev.kind === 'ko'

  const [mine, theirs] = SIDES.map(s => TACTICS.find(t => t.id === result[s].tactic))
  const clash = mine.beats === theirs.id ? `Tactic edge to ${home || 'you'}: ${mine.name} beats ${theirs.name}`
    : theirs.beats === mine.id ? `Tactic edge to ${home ? rival : 'them'}: ${theirs.name} beats ${mine.name}`
    : `Both chose ${mine.name}, so no tactic edge`
  const won = result.winner === 'a'

  return (
    <dialog ref={dialog} onClose={onClose} aria-label={`Battle against ${rival}`} className="picker">
      <div className="flex items-center justify-between gap-3 p-3 border-b-[3px] border-current">
        <p className="label !whitespace-normal">{home || 'You'} vs {rival} · {label || (result.ranked ? 'Battle' : 'Spar, levels evened')}</p>
        <button onClick={onClose} className="label border-2 border-current px-3 py-2">Close</button>
      </div>

      <div className="overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 p-3 w-full max-w-sm mx-auto">
          {SIDES.map(side => {
            const f = fighter(side), c = chars[f.character_id], hp = ev.hp[side]
            return (
              <div key={side} className="min-w-0">
                <ol aria-label={`${side === 'b' ? rival : home || 'Your'} fighters`} className="flex gap-1 mb-2">
                  {result[side].fighters.map((m, i) => {
                    const out = i < ev[side] || (i === ev[side] && !hp)
                    return (
                      <li key={m.character_id} className={`border-2 ${i === ev[side] ? 'border-[var(--spot)]' : 'border-current/30'}`}>
                        <img src={chars[m.character_id]?.image_url} alt={`${chars[m.character_id]?.name}${out ? ', knocked out' : ''}`} className={`w-7 h-8 object-cover object-top ${out ? 'grayscale brightness-50' : ''}`} />
                      </li>
                    )
                  })}
                </ol>
                <div ref={art[side]} className="relative">
                  <img src={c?.image_url} alt="" className={`block w-full h-[min(24dvh,15rem)] object-cover object-top border-[3px] ${struck === side ? 'border-[var(--spot)]' : 'border-[var(--line)]'} ${hp ? '' : 'grayscale brightness-50'}`} />
                  {struck === side && (
                    <span key={step} aria-hidden="true" className={`hit-pop poster absolute inset-x-0 top-1/3 text-center text-white [text-shadow:3px_3px_0_#000] ${loud ? 'text-6xl' : 'text-4xl'}`}>−{ev.damage}</span>
                  )}
                </div>
                <p className="poster text-lg mt-2 line-clamp-2 break-words">{c?.name}</p>
                <p className="label muted mb-1.5">Lv {f.level} · {f.power_type}</p>
                <Bar value={hp} max={maxHp(f.stats)} color="var(--spot)" label={`${c?.name} health`} />
                <p className="label muted !text-[0.625rem] mt-1 mb-1">{hp} health</p>
                <Bar value={ev.meter[side]} max={100} color="var(--ink)" label={`${c?.name} special charge`} />
                <p className="label muted !text-[0.625rem] mt-1">Special charge</p>
              </div>
            )
          })}
        </div>

        <p role="status" className="poster text-2xl text-center px-3 pb-3 min-h-[3.5rem]" style={loud ? { color: 'var(--spot-text)' } : undefined}>{line}</p>

        {done && (
          <div ref={el => { el?.scrollIntoView({ block: 'nearest' }) }} className="arrive border-t-[3px] border-current p-4 text-center">
            <p className="poster text-5xl" style={won ? { color: 'var(--spot-text)' } : undefined}>{home ? `${won ? home : rival} wins` : won ? 'Victory' : 'Defeat'}</p>
            <p className="text-sm mt-2">{clash}.</p>
            {!label && <p className="poster text-2xl mt-3">{result.ranked ? `+${result.xp} XP for each fighter` : 'Spar: no XP'}</p>}
            {result.levelUps.length > 0 && (
              <p className="text-sm font-semibold mt-1">
                Level up: {result.levelUps.map(u => `${chars[u.character_id]?.name} (Lv ${u.level})`).join(', ')}. You have points to spend.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 border-t-[3px] border-current">
        {done ? (
          <button onClick={() => (result.levelUps.length ? onSpend(result.levelUps[0].character_id) : onClose())} className="btn-spot text-xl py-3 col-span-2">
            {result.levelUps.length ? 'Spend points' : label ? 'Back' : 'Back to squad'}
          </button>
        ) : (
          <>
            <button onClick={() => setFast(f => !f)} aria-pressed={fast} className="btn text-lg py-3">2× speed</button>
            <button onClick={() => setStep(last)} className="btn text-lg py-3">Skip to result</button>
          </>
        )}
      </div>
    </dialog>
  )
}
