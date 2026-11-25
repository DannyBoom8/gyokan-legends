'use client'
import { useState } from 'react'
import Link from 'next/link'
import { POWER_TYPES } from '../../lib/game'
import { cardNote } from '../../lib/squad'
import useCards from '../../components/useCards'
import PageSkeleton from '../../components/Skeleton'
import { Screen, PageHead } from '../../components/Manga'
import { Empty } from '../../components/Players'
import NoSquad from '../../components/NoSquad'
import Wallet from '../../components/Wallet'
import CardArt from '../../components/CardArt'
import FighterSheet from '../../components/FighterSheet'
import { rankLetter } from '../../components/RankTag'

// every card I own: upgrade any of them, swap one into the squad
export default function Cards() {
  const { data, busy, error, setError, act } = useCards()
  const [type, setType] = useState('')
  const [open, setOpen] = useState(null) // a card_id

  if (!data) return <PageSkeleton variant="list" nav="cards" title="My Cards" />

  const { cards, chars, squad, coins, failed } = data
  const name = (c) => chars[c.character_id]?.name || ''
  const shown = cards.filter(c => !type || chars[c.character_id]?.power_type === type)
    .sort((a, b) => !!b.slot - !!a.slot || b.upgrades - a.upgrades || name(a).localeCompare(name(b)))
  const selected = cards.find(c => c.card_id === open)
  const close = () => { setError(''); setOpen(null) }

  return (
    <Screen nav="cards">
      <PageHead title="My Cards" aside={squad && <Wallet items={[[squad.pool, squad.pool === 1 ? 'point' : 'points'], [coins, 'coins']]} />} />
      {failed ? <Empty>Cards can only be tried in the demo for now.</Empty> : !squad ? <NoSquad /> : (
        <>
          <div role="group" aria-label="Power type" className="flex flex-wrap gap-1.5 mb-3">
            {['', ...POWER_TYPES].map(t => (
              <button key={t} aria-pressed={type === t} onClick={() => setType(t)} className="btn bg-[var(--panel)] text-sm px-3 py-2">{t || 'All'}</button>
            ))}
          </div>
          {error && !selected && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-3" style={{ color: 'var(--spot-text)' }}>{error}</p>}
          <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {shown.map(c => {
              const note = cardNote(c, squad.pool)
              return (
                <li key={c.card_id} className="min-w-0">
                  <button onClick={() => { setError(''); setOpen(c.card_id) }}
                    aria-label={`${name(c)}, rank ${rankLetter(c.upgrades)} ${chars[c.character_id]?.power_type}${c.slot ? ', in your squad' : ''}${c.locked ? ', locked' : ''}${note ? `, ${note[1]}` : ''}`}
                    className="art hov-thumb press w-full flex flex-col gap-1">
                    <CardArt upgrades={c.upgrades} character={chars[c.character_id]} badge={note?.[0]}>
                      {c.slot && <span className="tag poster text-xs left-0 top-1.5">Squad</span>}
                      {c.locked && <span className="tag poster text-xs left-0 bottom-0">Locked</span>}
                    </CardArt>
                    <span className="poster text-xs sm:text-sm block w-full text-center truncate">{name(c)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {!shown.length && <p className="muted text-sm text-center py-6">No {type} cards.</p>}
          <p className="muted text-sm mt-4">More cards come from the <Link href="/market" className="underline font-semibold text-[var(--ink)]">market</Link> and your <Link href="/rewards" className="underline font-semibold text-[var(--ink)]">rewards</Link>.</p>
        </>
      )}
      {selected && (
        <FighterSheet key={selected.card_id} card={selected} cards={cards} chars={chars} pool={squad.pool} coins={coins}
          error={error} busy={busy} act={act} onClose={close} />
      )}
    </Screen>
  )
}
