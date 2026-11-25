'use client'
import { useEffect, useRef, useState } from 'react'
import { STATS } from '../lib/game'
import { CARD_RANKS, POINTS_PER_UPGRADE, PRICES, RANK_PERKS, RANK_START, STAT_JOBS, TRAITS, TRAIT_RANKS, UPGRADES_PER_RANK, feedValue, pointsToTop, poolCost, rankOf, statCap, traitChoices, traitPending, upgradeCost } from '../lib/squad'
import CardArt from './CardArt'
import RankTag, { rankLetter } from './RankTag'

// one card: its traits, upgrading it, spending stat points, and its place in the squad.
// `cards` is every card I own, for the swap and for using spares up.
export default function FighterSheet({ card, cards, chars, pool, coins, error, busy, act, onClose }) {
  const ref = useRef(null)
  const [confirm, setConfirm] = useState('') // what a second tap will do
  const [feeding, setFeeding] = useState(false)
  const character = chars[card.character_id]
  const cap = statCap(card.upgrades)
  const placed = card.upgrades * POINTS_PER_UPGRADE - card.points
  const rank = rankOf(card.upgrades)
  const cost = upgradeCost(card.upgrades) // undefined at the top rank
  const done = card.upgrades - RANK_START[rank], need = UPGRADES_PER_RANK[rank]
  const own = card.fed || 0
  const room = pointsToTop(card.upgrades) - own // how many more points this card could ever use
  const spares = cards.filter(c => !c.slot && !c.locked && c.card_id !== card.card_id)
    .map(c => ({ ...c, same: c.character_id === card.character_id }))
    .sort((a, b) => b.same - a.same || a.upgrades - b.upgrades)
  const replaced = !card.slot && cards.find(c => c.slot && chars[c.character_id]?.power_type === character?.power_type)
  const powers = [
    ...TRAIT_RANKS.map((at, i) => ({ at, ...(TRAITS[card.traits?.[i]] || { name: 'A trait you choose', hint: 'Pick one of three' }) })),
    ...Object.values(RANK_PERKS).map(p => ({ ...p, at: p.rank })),
  ].sort((a, b) => a.at - b.at)

  useEffect(() => { if (!ref.current.open) ref.current.showModal() }, [])

  // anything permanent takes two taps
  const twice = (key, run) => ({
    'aria-pressed': confirm === key,
    onBlur: () => setConfirm(c => c === key ? '' : c),
    onClick: (e) => { if (confirm === key) { setConfirm(''); run() } else { e.currentTarget.focus(); setConfirm(key) } },
  })

  return (
    <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()} aria-label={character?.name} className="picker">
      <div className="flex items-center gap-3 p-3 border-b-[3px] border-current">
        <CardArt upgrades={card.upgrades} character={character} className="relative flex-shrink-0 w-16 h-20" />
        <div className="flex-1 min-w-0">
          <h2 className="poster text-2xl sm:text-3xl break-words">{character?.name}</h2>
          <p className="label muted mt-1.5 !whitespace-normal">Rank {rankLetter(card.upgrades)} · {character?.power_type}{card.locked ? ' · Locked' : ''}</p>
          <p className="label mt-1 !whitespace-normal">{cost ? `${done} of ${need} upgrades to ${CARD_RANKS[rank + 1]}` : 'Top rank'}</p>
          {cost && (
            <div className="h-2 mt-1 bg-[color-mix(in_oklab,var(--ink)_15%,transparent)]" aria-hidden="true">
              <div className="h-full bg-[var(--spot)]" style={{ width: `${done / need * 100}%` }} />
            </div>
          )}
        </div>
        <button onClick={onClose} className="label self-start border-2 border-current px-3 py-2">Close</button>
      </div>

      <div className="relative overflow-y-auto">
        {traitPending(card) && (
          <section className="px-3 pt-3" aria-label="Choose a trait">
            <h3 className="poster text-2xl" style={{ color: 'var(--spot-text)' }}>Choose a trait</h3>
            <p className="muted text-sm mt-1 mb-2">One of these three. It stays on this card.</p>
            <div className="flex flex-col gap-2">
              {traitChoices(card).map(id => (
                <button key={id} disabled={busy} {...twice(`trait-${id}`, () => act('squad_trait', { p_card: card.card_id, p_trait: id }))} className="btn text-left px-3 py-2.5">
                  <span className="block text-lg">{TRAITS[id].name}</span>
                  <span className="block text-sm font-[family-name:var(--font-geist)] normal-case tracking-normal leading-snug mt-1">{confirm === `trait-${id}` ? 'Tap again to take it' : TRAITS[id].hint}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {cost && (
          <div className="px-3 pt-3">
            <button onClick={() => act('squad_upgrade', { p_card: card.card_id })} disabled={busy || pool < poolCost(card)} className="btn-spot text-xl w-full py-3">
              Upgrade · costs {cost}
            </button>
            <p className="label muted !whitespace-normal mt-1.5">You have {pool} upgrade {pool === 1 ? 'point' : 'points'}{own ? `, and this card has ${own} of its own, used first` : ''}.</p>
            {room > 0 && (spares.length ? (
              <button onClick={() => setFeeding(f => !f)} aria-expanded={feeding} className="btn text-base w-full py-2.5 mt-2">Use up a spare card</button>
            ) : <p className="muted text-sm mt-2">Spare cards from the market or rewards can be used up here for points.</p>)}
            {feeding && room > 0 && spares.length > 0 && (
              <>
                <p className="muted text-sm mt-2">The card you use is gone for good. The same character is worth double.</p>
                <ul className="divide-y-2 divide-current/20 mt-1">
                  {spares.map(s => {
                    const worth = feedValue(s, s.same) + (s.fed || 0)
                    return (
                      <li key={s.card_id} className="flex items-center gap-3 py-2">
                        <CardArt upgrades={s.upgrades} character={chars[s.character_id]} className="relative flex-shrink-0 w-11 h-14" tag="!text-xs !px-1 !py-0.5" />
                        <p className="flex-1 min-w-0 text-sm">
                          <span className="poster text-base block truncate">{chars[s.character_id]?.name}</span>
                          +{worth} {worth === 1 ? 'point' : 'points'}{s.same ? ' · same character' : ''}{worth > room ? ` · only ${room} needed` : ''}
                        </p>
                        <button disabled={busy} {...twice(`use-${s.card_id}`, () => act('squad_feed', { p_card: card.card_id, p_use: s.card_id }))}
                          aria-label={`${confirm === `use-${s.card_id}` ? 'Confirm: use up' : 'Use up'} ${chars[s.character_id]?.name}, rank ${rankLetter(s.upgrades)}`}
                          className="btn text-sm w-20 py-2.5 flex-shrink-0">{confirm === `use-${s.card_id}` ? 'Sure?' : 'Use'}</button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-3 pt-3">
          <p role="status" className={`poster text-2xl ${card.points ? '' : 'muted'}`} style={card.points ? { color: 'var(--spot-text)' } : undefined}>
            {card.points ? `${card.points} stat ${card.points === 1 ? 'point' : 'points'} to spend` : 'No stat points to spend'}
          </p>
          {card.points > 0 && <button disabled={busy} onClick={() => act('squad_spread', { p_card: card.card_id })} className="btn text-sm px-3 py-2 flex-shrink-0">Spread evenly</button>}
        </div>
        <p className="label muted !whitespace-normal px-3 mt-1.5">Limit for this card: {cap} per stat</p>
        <ul className="divide-y-2 divide-current/20 px-3">
          {STATS.map(stat => (
            <li key={stat} className="flex items-center gap-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="poster text-lg">{stat === 'iq' ? 'IQ' : stat}</span>
                  <span className="poster text-xl">{card.stats[stat]}</span>
                </div>
                <div className="h-2 mt-1 bg-[color-mix(in_oklab,var(--ink)_15%,transparent)]" aria-hidden="true">
                  <div className="h-full bg-[var(--spot)]" style={{ width: `${Math.min(100, card.stats[stat] / cap * 100)}%` }} />
                </div>
                <p className="muted text-xs mt-1">{STAT_JOBS[stat]}</p>
              </div>
              <button onClick={() => act('squad_allocate', { p_card: card.card_id, p_stat: stat })}
                disabled={busy || !card.points || card.stats[stat] >= cap} aria-label={`Add a point to ${stat}`}
                className="btn text-2xl w-12 h-12 flex-shrink-0">+</button>
            </li>
          ))}
        </ul>

        <h3 className="poster text-xl px-3 pt-3">Traits and powers</h3>
        <ul className="divide-y-2 divide-current/20 px-3 pb-2">
          {powers.map((p, i) => (
            <li key={i} className={`flex items-center gap-3 py-2 ${rank < p.at ? 'opacity-60' : ''}`}>
              <RankTag upgrades={RANK_START[p.at]} className="text-base flex-shrink-0" />
              <p className="flex-1 min-w-0 text-sm"><span className="poster text-base block">{p.name}</span>{p.hint}</p>
              {rank < p.at && <span className="label">Locked</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 border-t-[3px] border-current">
        {error && <p role="alert" className="text-sm font-semibold mb-2" style={{ color: 'var(--spot-text)' }}>{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          {card.slot ? (
            <button onClick={() => act('squad_move_up', { p_slot: card.slot })} disabled={busy || card.slot === 1} className="btn text-base py-3">
              {card.slot === 1 ? 'Fights first' : 'Fight earlier'}
            </button>
          ) : (
            <button onClick={() => act('squad_swap', { p_slot: replaced.slot, p_card: card.card_id })} disabled={busy || !replaced}
              aria-label={`Put in squad${replaced ? ` in place of ${chars[replaced.character_id]?.name}` : ''}`} className="btn-spot text-base py-3">
              Put in squad
            </button>
          )}
          <button disabled={busy} aria-pressed={!!card.locked} onClick={() => act('squad_lock', { p_card: card.card_id })} className="btn text-base py-3">
            {card.locked ? 'Unlock' : 'Lock'}
          </button>
          {placed > 0 && (
            <button disabled={busy || coins < PRICES.reset} {...twice('reset', () => act('squad_reset', { p_card: card.card_id }))} className="btn text-base py-3 col-span-2">
              {confirm === 'reset' ? `Tap again: ${placed} points come back` : `Reset stats · ${PRICES.reset} of your ${coins} coins`}
            </button>
          )}
        </div>
        {replaced && <p className="muted text-xs mt-2">Takes the place of {chars[replaced.character_id]?.name}, rank {rankLetter(replaced.upgrades)}.</p>}
      </div>
    </dialog>
  )
}
