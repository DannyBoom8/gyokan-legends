'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { isDemo } from '../../lib/demo'
import { weekOf } from '../../lib/guild-rules'
import { CARD_RANKS, DAILY_REWARDS, RANK_START, WEEKLY_REWARD, rewardsDue } from '../../lib/squad'
import useCards, { CHARACTER_COLUMNS } from '../../components/useCards'
import PageSkeleton from '../../components/Skeleton'
import { Screen, PageHead, Panel, Caption } from '../../components/Manga'
import { Empty } from '../../components/Players'
import NoSquad from '../../components/NoSquad'
import Wallet from '../../components/Wallet'
import CardArt from '../../components/CardArt'

const WORDS = {
  coins: (n) => `${n} coins`,
  points: (n) => `${n} upgrade points`,
  battle: () => 'an extra ranked battle today',
  card: () => 'a card',
}
const daily = DAILY_REWARDS.map(r => `${WORDS[r.kind](r.amount)} (${r.odds}%)`).join(', ')

// one surprise a day, one bundle a week
export default function Rewards() {
  const { data, busy, error, act } = useCards()
  const [got, setGot] = useState(null) // what the last claim gave

  if (!data) return <PageSkeleton variant="list" nav="rewards" title="Rewards" />

  const { squad, coins, failed } = data
  const due = rewardsDue(squad, new Date().toISOString().slice(0, 10), weekOf())
  const claim = (when) => act('reward_claim', { p_when: when }, async (result) => {
    const { data: character } = result.card
      ? await supabase.from('characters').select(CHARACTER_COLUMNS).eq('character_id', result.card.character_id).maybeSingle()
      : { data: null }
    setGot({ ...result, character })
  })
  const demo = (name) => { setGot(null); act(name) }

  const offers = [
    { when: 'daily', title: 'Daily', text: `One of: ${daily}.`, later: 'Claimed. Back tomorrow' },
    { when: 'weekly', title: 'Weekly', text: `${WEEKLY_REWARD.coins} coins, ${WEEKLY_REWARD.points} upgrade points and a card of rank ${CARD_RANKS[WEEKLY_REWARD.floor]} or better.`, later: 'Claimed. Back next week' },
  ]

  return (
    <Screen nav="rewards">
      <PageHead title="Rewards" aside={squad && <Wallet items={[[squad.pool, squad.pool === 1 ? 'point' : 'points'], [coins, 'coins']]} />} />
      {failed ? <Empty>Rewards can only be tried in the demo for now.</Empty> : !squad ? <NoSquad /> : (
        <>
          {error && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-3" style={{ color: 'var(--spot-text)' }}>{error}</p>}
          <div role="status" className="empty:hidden">
            {got && (
              <div className="box arrive flex items-center gap-4 p-4 mb-3">
                {got.card && <CardArt upgrades={RANK_START[got.card.rank]} character={got.character} className="relative flex-shrink-0 w-24 aspect-[3/4]" />}
                <div className="min-w-0">
                  <p className="label muted">You got</p>
                  <ul className="poster text-2xl mt-1">
                    {got.coins > 0 && <li>{WORDS.coins(got.coins)}</li>}
                    {got.points > 0 && <li>{WORDS.points(got.points)}</li>}
                    {got.battle > 0 && <li>{WORDS.battle()}</li>}
                    {got.card && <li className="break-words">{got.character?.name}, rank {CARD_RANKS[got.card.rank]}{got.card.big ? ', a big name' : ''}</li>}
                  </ul>
                  {got.card && <Link href="/cards" className="underline text-sm font-semibold inline-block mt-2">See your cards</Link>}
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {offers.map((o, i) => (
              <Panel key={o.when} i={i + 1} pageClass="flex flex-col">
                <Caption>{o.title}</Caption>
                <div className="flex-1 flex flex-col gap-3 p-4">
                  <p className="text-sm flex-1">{o.text}</p>
                  <button onClick={() => claim(o.when)} disabled={busy || !due[o.when]} className="btn-spot text-lg w-full py-3">
                    {due[o.when] ? `Claim ${o.when} reward` : o.later}
                  </button>
                </div>
              </Panel>
            ))}
          </div>
          {isDemo() && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => demo('squad_new_day')} disabled={busy} className="btn text-sm px-3 py-2">Next day (demo)</button>
              <button onClick={() => demo('squad_new_week')} disabled={busy} className="btn text-sm px-3 py-2">Next week (demo)</button>
            </div>
          )}
        </>
      )}
    </Screen>
  )
}
