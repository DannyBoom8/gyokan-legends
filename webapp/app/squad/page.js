'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { POWER_HEX } from '../../lib/game'
import { CARD_RANKS, DAILY_FIGHTS, EXTRA_PER_WEEK, PRICES, RANK_PERKS, RANK_START, TACTICS, cardNote, fightsLeft, squadRank } from '../../lib/squad'
import useCards from '../../components/useCards'
import { weekOf } from '../../lib/guild-rules'
import PageSkeleton from '../../components/Skeleton'
import { Screen, PageHead } from '../../components/Manga'
import { Empty } from '../../components/Players'
import Icon from '../../components/Icon'
import RankTag, { rankLetter } from '../../components/RankTag'
import StartCards from '../../components/StartCards'
import FighterSheet from '../../components/FighterSheet'

// the formation, in fight order: one in front, then two, then three
const ROWS = [['First', [1]], ['Next', [2, 3]], ['Last', [4, 5, 6]]]

// what reaching each card rank brings
const PERKS = [null, 'A trait you choose', RANK_PERKS.quick.name, 'A second trait', RANK_PERKS.burst.name, RANK_PERKS.awaken.name]

// the settings, kept off the formation so all six cards stay on one screen
function Options({ data, busy, error, act, onClose }) {
  const ref = useRef(null)
  const router = useRouter()
  useEffect(() => { if (!ref.current.open) ref.current.showModal() }, [])
  const { tactic, coins, extras, rank } = data

  return (
    <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()} aria-label="Squad options" className="picker">
      <div className="flex items-center justify-between gap-3 p-3 border-b-[3px] border-current">
        <h2 className="poster text-2xl">Squad rank {CARD_RANKS[rank]}</h2>
        <button onClick={onClose} className="label border-2 border-current px-3 py-2">Close</button>
      </div>
      <div className="relative overflow-y-auto p-3 flex flex-col gap-4">
        {error && <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--spot-text)' }}>{error}</p>}
        <section>
          <h3 className="poster text-xl mb-2">Tactic</h3>
          <div role="group" aria-label="Tactic" className="grid grid-cols-3 gap-2">
            {TACTICS.map(t => (
              <button key={t.id} disabled={busy} aria-pressed={tactic === t.id} onClick={() => act('squad_tactic', { p_tactic: t.id })} className="btn text-lg py-2.5">{t.name}</button>
            ))}
          </div>
          <p className="muted text-sm mt-2">{TACTICS.find(t => t.id === tactic)?.hint} Rivals don&apos;t see it until the fight.</p>
        </section>
        <section>
          <h3 className="poster text-xl mb-2">Coins: {coins}</h3>
          <p className="muted text-sm mb-2">Your <button onClick={() => router.push('/lineup')} className="underline font-semibold text-[var(--ink)]">lineup</button> earns one for every point on battle night, and rewards add more. They also buy cards in the <button onClick={() => router.push('/market')} className="underline font-semibold text-[var(--ink)]">market</button>.</p>
          <button onClick={() => act('squad_buy_battle', {})} disabled={busy || extras < 1 || coins < PRICES.extra} className="btn text-base py-3 w-full">
            +1 ranked battle today · {PRICES.extra} coins
          </button>
          <p className="label muted !whitespace-normal mt-1.5">{extras} of {EXTRA_PER_WEEK} left this week</p>
        </section>
        <section>
          <h3 className="poster text-xl mb-2">How cards rank up</h3>
          <p className="muted text-sm mb-2">Win a ranked battle to earn an upgrade point, once per rival each day, with {DAILY_FIGHTS} free ranked battles a day. Spend points on any card, or use up spare cards. Each upgrade gives it 3 stat points, and enough upgrades raise its rank.</p>
          <ol aria-label="Card ranks" className="flex flex-col gap-1.5">
            {RANK_START.map((upgrades, rank) => (
              <li key={upgrades} className="flex items-center gap-3">
                <RankTag upgrades={upgrades} className="text-lg w-8 text-center" />
                <span className="text-sm">{PERKS[rank] || 'Where cards start'}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </dialog>
  )
}

export default function Squad() {
  const { data, busy, error, setError, act } = useCards()
  const [open, setOpen] = useState(null) // a card_id, or 'options'
  const router = useRouter()

  if (!data) return <PageSkeleton variant="cards" nav="squad" title="My Squad" />

  const { cards, chars, squad, coins } = data
  const mine = cards.filter(c => c.slot).sort((a, b) => a.slot - b.slot)
  const pool = squad?.pool || 0, tactic = squad?.tactic
  const left = fightsLeft(squad, new Date().toISOString().slice(0, 10))
  const close = () => { setError(''); setOpen(null) }
  const alert = error && !open && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-2" style={{ color: 'var(--spot-text)' }}>{error}</p>

  if (data.failed) return (
    <Screen nav="squad">
      <PageHead title="My Squad" />
      <Empty>Squads can only be tried in the demo for now.</Empty>
    </Screen>
  )

  if (!mine.length) return (
    <Screen nav="squad" width="max-w-3xl">
      <PageHead title="My Squad" sub="Everyone starts equally strong. You decide how they grow." />
      <StartCards busy={busy} error={error} onStart={(args) => act('squad_create', args, () => window.scrollTo(0, 0))} />
    </Screen>
  )

  // one card, laid out like a Fantasy lineup place, with the rank where the overall sits
  const token = (slot) => {
    const card = mine.find(c => c.slot === slot)
    const c = chars[card?.character_id]
    if (!card) return null
    const note = cardNote(card, pool)
    return (
      <div key={card.card_id} className="relative flex flex-col justify-center min-h-0 w-[min(28%,10.5rem)]">
        <button onClick={() => { setError(''); setOpen(card.card_id) }}
          aria-label={`${c?.name}, rank ${rankLetter(card.upgrades)} ${c?.power_type}, fights number ${slot}${note ? `, ${note[1]}` : ''}`}
          className="art hov-thumb press w-full h-full max-h-[14rem] flex flex-col gap-1">
          <span className="relative block w-full flex-1 min-h-0">
            <span data-rank={rankLetter(card.upgrades)} className="rank-frame absolute top-0 h-full left-1/2 -translate-x-1/2 aspect-square md:aspect-[4/5] max-w-full bg-[var(--panel)]">
              <span className="absolute inset-0 overflow-hidden">
                <img src={c?.image_url} alt="" className="w-full h-full object-cover object-top" />
              </span>
              <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: POWER_HEX[c?.power_type] }} />
              <span className="tag poster text-xs left-0 top-1.5">{slot}</span>
              {note && <span className="label !text-[0.5625rem] absolute right-0 top-1.5 bg-[var(--spot)] !text-[#fff] px-1 py-0.5">{note[0]}</span>}
              <RankTag upgrades={card.upgrades} className="absolute right-0 bottom-0 text-lg sm:text-2xl" />
            </span>
          </span>
          <span className="poster text-xs sm:text-sm block w-full text-center truncate">{c?.name}</span>
        </button>
      </div>
    )
  }

  const selected = mine.find(c => c.card_id === open)

  return (
    <Screen nav="squad" fit="always">
      <PageHead compact title="My Squad" aside={
        <div className="flex items-center gap-1.5">
          <p className="label border-2 border-[var(--line)] px-2 py-2">{pool} <span className="max-sm:sr-only">upgrade </span>{pool === 1 ? 'point' : 'points'}</p>
          <button onClick={() => { setError(''); setOpen('options') }} className="btn text-sm px-3 py-2">
            {TACTICS.find(t => t.id === tactic)?.name}<span className="sr-only"> tactic, squad options</span>
          </button>
        </div>
      } />
      {alert}

      {/* not a Panel: a clipped parent would cut off the lifted cards */}
      <div className="box arrive relative flex-1 min-h-0 grid grid-rows-3 gap-1.5 p-2" style={{ '--i': 1 }}>
        <div className="tone absolute inset-0" aria-hidden="true" />
        {ROWS.map(([label, slots]) => (
          <div key={label} className="relative flex justify-center items-stretch gap-2 sm:gap-5 min-h-0">
            <p className="label muted !text-[0.5625rem] absolute left-0 inset-y-0 w-3 flex items-center justify-center rotate-180 [writing-mode:vertical-rl]">{label}</p>
            {slots.map(token)}
          </div>
        ))}
      </div>

      <button onClick={() => router.push('/battle')} className="btn-spot poster text-xl w-full py-2.5 mt-2 flex flex-shrink-0 items-center justify-center gap-2">
        <Icon name="swords" size={20} /> Go to battle · {left} ranked left
      </button>

      {selected && (
        <FighterSheet key={selected.card_id} card={selected} cards={cards} chars={chars} pool={pool} coins={coins}
          error={error} busy={busy} act={act} onClose={close} />
      )}
      {open === 'options' && <Options data={{
        tactic, coins, rank: squadRank(mine),
        extras: EXTRA_PER_WEEK - (squad.week === weekOf() ? squad.extras : 0),
      }} busy={busy} error={error} act={act} onClose={close} />}
    </Screen>
  )
}
