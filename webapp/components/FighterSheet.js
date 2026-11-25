'use client'
import { useEffect, useRef, useState } from 'react'
import { STATS } from '../lib/game'
import { MAX_LEVEL, POINTS_PER_LEVEL, PRICES, STAT_JOBS, statCap, xpToNext } from '../lib/squad'
import FighterPicker from './FighterPicker'

// one fighter: spend points, change the order, or swap in someone else
export default function FighterSheet({ fighter, character, credits, taken, error, busy, act, onClose }) {
  const ref = useRef(null)
  const [swapping, setSwapping] = useState(false)
  const cap = statCap(fighter.level)
  const placed = (fighter.level - 1) * POINTS_PER_LEVEL - fighter.points
  const [resetting, setResetting] = useState(false)

  useEffect(() => { if (!ref.current.open) ref.current.showModal() }, [])

  return (
    <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()} aria-label={character?.name} className="picker">
      <div className="flex items-center gap-3 p-3 border-b-[3px] border-current">
        <img src={character?.image_url} alt="" className="w-16 h-20 object-cover object-top border-2 border-current" />
        <div className="flex-1 min-w-0">
          <h2 className="poster text-2xl sm:text-3xl break-words">{character?.name}</h2>
          <p className="label muted mt-1.5">Lv {fighter.level} · {character?.power_type}</p>
          <p className="label mt-1">{fighter.level < MAX_LEVEL ? `${fighter.xp} / ${xpToNext(fighter.level)} XP` : 'Top level'}</p>
        </div>
        <button onClick={onClose} className="label self-start border-2 border-current px-3 py-2">Close</button>
      </div>

      <div className="overflow-y-auto">
        {swapping ? (
          <div className="p-3">
            <p className="text-sm mb-3">Choose who takes this place. {character?.name} keeps their levels on the bench.</p>
            <FighterPicker taken={taken} onPick={c => act('squad_swap', { p_slot: fighter.slot, p_character: c.character_id }, onClose)} />
          </div>
        ) : (
          <>
            <p role="status" className={`px-3 pt-3 poster text-2xl ${fighter.points ? '' : 'muted'}`} style={fighter.points ? { color: 'var(--spot-text)' } : undefined}>
              {fighter.points ? `${fighter.points} ${fighter.points === 1 ? 'point' : 'points'} to spend` : 'Win XP to earn more points'}
            </p>
            <p className="label muted !whitespace-normal px-3 mt-1.5">Limit at this level: {cap} per stat</p>
            <ul className="divide-y-2 divide-current/20 px-3">
              {STATS.map(stat => (
                <li key={stat} className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="poster text-lg">{stat === 'iq' ? 'IQ' : stat}</span>
                      <span className="poster text-xl">{fighter.stats[stat]}</span>
                    </div>
                    <div className="h-2 mt-1 bg-[color-mix(in_oklab,var(--ink)_15%,transparent)]" aria-hidden="true">
                      <div className="h-full bg-[var(--spot)]" style={{ width: `${Math.min(100, fighter.stats[stat] / cap * 100)}%` }} />
                    </div>
                    <p className="muted text-xs mt-1">{STAT_JOBS[stat]}</p>
                  </div>
                  <button onClick={() => act('squad_allocate', { p_character: fighter.character_id, p_stat: stat })}
                    disabled={busy || !fighter.points || fighter.stats[stat] >= cap} aria-label={`Add a point to ${stat}`}
                    className="btn text-2xl w-12 h-12 flex-shrink-0">+</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="p-3 border-t-[3px] border-current">
        {error && <p role="alert" className="text-sm font-semibold mb-2" style={{ color: 'var(--spot-text)' }}>{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => act('squad_move_up', { p_slot: fighter.slot })} disabled={busy || fighter.slot === 1} className="btn text-base py-3">
            {fighter.slot === 1 ? 'Fights first' : 'Fight earlier'}
          </button>
          <button onClick={() => setSwapping(s => !s)} aria-pressed={swapping} className="btn text-base py-3">{swapping ? 'Back to stats' : 'Swap fighter'}</button>
          {!swapping && placed > 0 && (
            <button disabled={busy || credits < PRICES.reset} aria-pressed={resetting} onBlur={() => setResetting(false)}
              onClick={() => resetting ? act('squad_reset', { p_character: fighter.character_id }, () => setResetting(false)) : setResetting(true)}
              className="btn text-base py-3 col-span-2">
              {resetting ? `Tap again: ${placed} points come back` : `Reset points · ${PRICES.reset} of your ${credits} credits`}
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
