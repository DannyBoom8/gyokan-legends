'use client'
import { useEffect, useRef, useState } from 'react'
import { TACTICS, fighterHp } from '../lib/squad'
import RankTag, { rankLetter } from './RankTag'

const SIDES = ['a', 'b']
const INTRO_MS = 2200
const other = (side) => side === 'a' ? 'b' : 'a'
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Bar({ value, max, color, label }) {
  return (
    <div className="h-2.5 bg-[color-mix(in_oklab,var(--ink)_15%,transparent)] overflow-hidden" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full w-full origin-left transition-transform duration-200 ease-out" style={{ background: color, transform: `scaleX(${value / max})` }} />
    </div>
  )
}

// plays back a battle that has already been decided: face-off, fight, result
export default function Arena({ result, chars, rival, home, label, onSpend, onClose }) {
  const dialog = useRef(null)
  const art = { a: useRef(null), b: useRef(null) }
  const [step, setStep] = useState(0)
  const [fast, setFast] = useState(false)
  const [phase, setPhase] = useState('intro') // intro, fight, result
  const last = result.events.length - 1
  const ev = result.events[step]
  const done = step === last
  const struck = ev.by && ev.damage ? other(ev.by) : null
  const fighter = (side) => result[side].fighters[ev[side]]
  const name = (side) => chars[fighter(side).character_id]?.name || 'Fighter'

  useEffect(() => { if (!dialog.current.open) dialog.current.showModal() }, [])

  useEffect(() => {
    if (phase === 'result') return
    const [next, ms] = phase === 'intro' ? [() => setPhase('fight'), still() ? 900 : INTRO_MS]
      : done ? [() => setPhase('result'), 1100] // a beat on the last knockout
      : [() => setStep(s => s + 1), fast ? 280 : 650] // six a side, so each blow is quick
    const wait = setTimeout(next, ms)
    return () => clearTimeout(wait)
  }, [phase, step, fast, done])

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
    : ev.kind === 'awaken' ? `${name(ev.by)} awakens!`
    : ev.kind === 'crit' ? `Critical hit! ${name(ev.by)} deals ${ev.damage}`
    : ev.kind === 'counter' ? `${name(ev.by)} counters for ${ev.damage}`
    : `${name(ev.by)} hits for ${ev.damage}`
  const loud = ['special', 'crit', 'ko', 'awaken'].includes(ev.kind)

  const [mine, theirs] = SIDES.map(s => TACTICS.find(t => t.id === result[s].tactic))
  const clash = mine.beats === theirs.id ? `Tactic edge to ${home || 'you'}: ${mine.name} beats ${theirs.name}`
    : theirs.beats === mine.id ? `Tactic edge to ${home ? rival : 'them'}: ${theirs.name} beats ${mine.name}`
    : `Both chose ${mine.name}, so no tactic edge`
  const won = result.winner === 'a'
  const team = (side) => side === 'a' ? home || 'You' : rival
  const end = result.events[last]

  return (
    <dialog ref={dialog} onClose={onClose} aria-label={`Battle against ${rival}`} className="picker arena">
      <div className="flex items-center justify-between gap-3 p-3 border-b-[3px] border-current">
        <p className="label !whitespace-normal">{home || 'You'} vs {rival} · {label || (result.ranked ? 'Battle' : 'Spar, levels evened')}</p>
        <button onClick={onClose} className="label border-2 border-current px-3 py-2">Close</button>
      </div>

      <div className="overflow-y-auto">
        {phase === 'intro' && (
          <div className="fight-intro">
            {SIDES.map(side => (
              <div key={side} className={`intro-${side} w-full ${side === 'b' ? 'order-3' : 'order-1'}`}>
                <p className="poster text-2xl break-words mb-2">{team(side)}</p>
                <ul className="flex justify-center gap-1 sm:gap-2">
                  {result[side].fighters.map(m => (
                    <li key={m.character_id} className="flex-1 min-w-0 max-w-[6rem]">
                      <span data-rank={rankLetter(m.upgrades)} className="rank-frame relative block">
                        <img src={chars[m.character_id]?.image_url} alt={chars[m.character_id]?.name} className="block w-full h-[min(14dvh,8rem)] [@media(max-height:700px)]:h-[11dvh] object-cover object-top" />
                        <RankTag upgrades={m.upgrades} className="absolute right-0 bottom-0 text-xs sm:text-base !px-1.5" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="intro-vs order-2 poster text-6xl [@media(max-height:700px)]:text-4xl -rotate-6 bg-[var(--spot)] text-white border-[3px] border-white px-4 py-1" aria-hidden="true">VS</p>
            <span className="load-bar order-4" style={{ '--fill-ms': `${INTRO_MS}ms` }} aria-hidden="true"><span /></span>
          </div>
        )}

        {phase === 'fight' && (
          <>
            <div className="grid grid-cols-2 gap-3 p-3 w-full max-w-sm mx-auto">
              {SIDES.map(side => {
                const f = fighter(side), c = chars[f.character_id], hp = ev.hp[side]
                return (
                  <div key={side} className="min-w-0">
                    <ol aria-label={`${side === 'b' ? rival : home || 'Your'} fighters`} className="grid grid-cols-6 gap-0.5 mb-2">
                      {result[side].fighters.map((m, i) => {
                        const out = i < ev[side] || (i === ev[side] && !hp)
                        return (
                          <li key={m.character_id} className={`border-2 ${i === ev[side] ? 'border-[var(--spot)]' : 'border-current/30'}`}>
                            <img src={chars[m.character_id]?.image_url} alt={`${chars[m.character_id]?.name}${out ? ', knocked out' : ''}`} className={`block w-full aspect-[4/5] object-cover object-top ${out ? 'grayscale brightness-50' : ''}`} />
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
                    <p className="label muted mb-1.5 flex items-center gap-1.5 min-w-0"><RankTag upgrades={f.upgrades} className="text-sm" /><span className="truncate">{f.power_type}</span></p>
                    <Bar value={hp} max={fighterHp(f)} color="var(--spot)" label={`${c?.name} health`} />
                    <p className="label muted !text-[0.625rem] mt-1 mb-1">{hp} health</p>
                    <Bar value={ev.meter[side]} max={100} color="var(--ink)" label={`${c?.name} special charge`} />
                    <p className="label muted !text-[0.625rem] mt-1">Special charge</p>
                  </div>
                )
              })}
            </div>

            <p role="status" className="poster text-2xl text-center px-3 pb-3 min-h-[3.5rem]" style={loud ? { color: 'var(--spot-text)' } : undefined}>{line}</p>
          </>
        )}

        {phase === 'result' && (
          <div role="status" className="fight-result">
            <p className="label muted">{label || (result.ranked ? 'Battle over' : 'Spar over')}</p>
            <p className="result-word poster text-6xl sm:text-7xl [@media(max-height:700px)]:text-5xl break-words max-w-full" style={won ? { color: 'var(--spot-text)' } : undefined}>{home ? `${team(result.winner)} wins` : won ? 'Victory' : 'Defeat'}</p>
            <ul aria-label={`${team(result.winner)}: winning fighters`} className="flex justify-center gap-1 sm:gap-2 w-full">
              {result[result.winner].fighters.map((m, i) => (
                <li key={m.character_id} className="result-card flex-1 min-w-0 max-w-[6rem]" style={{ '--i': i }}>
                  <span data-rank={rankLetter(m.upgrades)} className="rank-frame relative block">
                    <img src={chars[m.character_id]?.image_url} alt={`${chars[m.character_id]?.name}${i < end[result.winner] ? ', knocked out' : ''}`}
                      className={`block w-full h-[min(16dvh,9rem)] [@media(max-height:700px)]:h-[12dvh] object-cover object-top ${i < end[result.winner] ? 'grayscale brightness-50' : ''}`} />
                    <RankTag upgrades={m.upgrades} className="absolute right-0 bottom-0 text-xs sm:text-base !px-1.5" />
                  </span>
                </li>
              ))}
            </ul>
            {!label && (
              <p className="poster text-3xl [@media(max-height:700px)]:text-2xl">
                {!result.ranked ? 'Spar: nothing earned'
                  : result.earned ? `+1 upgrade point${result.points ? ` · +${result.points} season points` : ''}`
                  : won ? 'Already earned from this rival today' : 'No upgrade point for a loss'}
              </p>
            )}
            <p className="muted text-sm">{clash}.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 border-t-[3px] border-current">
        {phase === 'intro' ? (
          <button onClick={() => setPhase('fight')} className="btn text-lg py-3 col-span-2">Skip intro</button>
        ) : phase === 'result' ? (
          <button onClick={() => (result.earned && onSpend ? onSpend() : onClose())} className="btn-spot text-xl py-3 col-span-2">
            {result.earned && onSpend ? 'Upgrade a card' : 'Back'}
          </button>
        ) : (
          <>
            <button onClick={() => setFast(f => !f)} aria-pressed={fast} className="btn text-lg py-3">2× speed</button>
            <button onClick={() => { setStep(last); setPhase('result') }} className="btn text-lg py-3">Skip to result</button>
          </>
        )}
      </div>
    </dialog>
  )
}
