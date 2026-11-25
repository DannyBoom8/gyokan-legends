'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CARD_RANKS, RANK_GATES, RANK_START, WIN_POINTS, marketOpen } from '../../lib/squad'
import useCards, { CHARACTER_COLUMNS } from '../../components/useCards'
import PageSkeleton from '../../components/Skeleton'
import { Screen, PageHead, Panel, Caption } from '../../components/Manga'
import { Empty } from '../../components/Players'
import NoSquad from '../../components/NoSquad'
import Wallet from '../../components/Wallet'
import CardArt from '../../components/CardArt'

// today's six cards, paid for in coins
export default function Market() {
  const { data, busy, error, act } = useCards()
  const [stock, setStock] = useState(null)
  const [confirm, setConfirm] = useState(null) // the slot a second tap will buy
  const [bought, setBought] = useState('')

  const loadStock = async () => {
    const { data: today } = await supabase.rpc('market_stock')
    if (!today) return
    const { data: chars } = await supabase.from('characters').select(CHARACTER_COLUMNS).in('character_id', today.items.map(i => i.character_id))
    setStock({ items: today.items.map(i => ({ ...i })), chars: Object.fromEntries((chars || []).map(c => [c.character_id, c])) })
  }
  // after every reload, so a bought card shows as sold
  useEffect(() => { if (data?.squad) loadStock() }, [data])

  if (!data || (data.squad && !stock)) return <PageSkeleton variant="list" nav="market" title="Market" />

  const { squad, coins, season, failed } = data

  return (
    <Screen nav="market">
      <PageHead title="Market" aside={squad && <Wallet items={[[coins, 'coins']]} />} />
      {failed ? <Empty>The market can only be tried in the demo for now.</Empty> : !squad ? <NoSquad /> : (
        <>
          <p className="muted text-sm mb-3">Six new cards every day, from midnight UTC. A card you buy joins My Cards.</p>
          {error && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-3" style={{ color: 'var(--spot-text)' }}>{error}</p>}
          <p role="status" className="poster text-xl mb-2 empty:hidden">{bought && `${bought} joined your cards`}</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            {stock.items.map(item => {
              const c = stock.chars[item.character_id]
              const open = marketOpen(item.rank, season), short = coins < item.price
              const asking = confirm === item.slot
              return (
                <li key={item.slot} className="box min-w-0 flex flex-col gap-2 p-2">
                  <CardArt upgrades={RANK_START[item.rank]} character={c} />
                  <div className="flex-1 min-w-0">
                    <p className="poster text-base truncate">{c?.name}</p>
                    <p className="label muted !text-[0.625rem] mt-1 !whitespace-normal">Rank {CARD_RANKS[item.rank]} · {c?.power_type}{item.big ? ' · Big name' : ''}</p>
                    <p className="label !text-[0.625rem] mt-1">{item.price} coins</p>
                  </div>
                  <button disabled={busy || item.sold || !open || short} aria-pressed={asking} onBlur={() => setConfirm(null)}
                    onClick={(e) => {
                      if (!asking) { e.currentTarget.focus(); return setConfirm(item.slot) }
                      setConfirm(null)
                      act('market_buy', { p_slot: item.slot }, () => setBought(c?.name))
                    }}
                    aria-label={`${item.sold ? 'Sold' : !open ? `Needs player rank ${RANK_GATES[item.rank]}` : short ? 'Not enough coins for' : asking ? 'Confirm: buy' : 'Buy'} ${c?.name}, rank ${CARD_RANKS[item.rank]}, ${item.price} coins`}
                    className="btn text-sm w-full py-2.5">
                    {item.sold ? 'Sold' : !open ? `Needs ${RANK_GATES[item.rank]}` : short ? 'Not enough' : asking ? 'Tap to buy' : 'Buy'}
                  </button>
                </li>
              )
            })}
          </ul>
          <Panel i={2} pageClass="flex flex-col">
            <Caption>Earning coins</Caption>
            <p className="muted text-sm p-4">
              Every season point is a coin: your lineup&apos;s battle night score, and {WIN_POINTS} for beating a rival, once per rival each day.
              Rewards add more. Higher ranks need a higher player rank as well as the coins.
            </p>
          </Panel>
        </>
      )}
    </Screen>
  )
}
