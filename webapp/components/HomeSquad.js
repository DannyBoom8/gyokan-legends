'use client'
import { useRouter } from 'next/navigation'
import { CARD_RANKS, cardNote, coinsOf, fightsLeft, rewardsDue, squadRank, traitPending } from '../lib/squad'
import { weekOf } from '../lib/guild-rules'
import RankTag, { rankLetter } from './RankTag'
import { supabase } from '../lib/supabase'
import { Panel, Caption } from './Manga'

// what Home needs to know about my squad; allTimePoints are the lineup points that become coins
export async function fetchSquad(userId) {
  const [{ data: squad }, { data: fighters }, { data: rank }] = await Promise.all([
    supabase.from('squads').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('fighters').select('*').eq('user_id', userId).in('slot', [1, 2, 3, 4, 5, 6]).order('slot'),
    supabase.from('user_ranks').select('all_time_points').eq('user_id', userId).maybeSingle(),
  ])
  const ids = (fighters || []).map(f => f.character_id)
  const { data: chars } = ids.length
    ? await supabase.from('characters').select('character_id, name, image_url').in('character_id', ids)
    : { data: [] }
  const today = new Date().toISOString().slice(0, 10)
  const due = squad ? rewardsDue(squad, today, weekOf()) : {}
  const line = (fighters || []).map(f => ({ ...f, character: chars.find(c => c.character_id === f.character_id) }))
  return {
    line,
    rank: squadRank(line),
    pool: squad?.pool || 0,
    ready: line.some(c => cardNote(c, squad?.pool || 0)?.[0] === 'Up'),
    trait: line.some(traitPending),
    reward: !!(due.daily || due.weekly),
    left: fightsLeft(squad, today),
    fought: squad?.day === today && squad.fights > 0,
    unspent: line.reduce((n, f) => n + f.points, 0),
    coins: coinsOf(rank?.all_time_points, squad),
  }
}

// the main game, front and centre on Home
export default function HomeSquad({ squad }) {
  const router = useRouter()
  const { line, rank, left, pool, coins } = squad
  const picked = line.length > 0

  return (
    <Panel i={2} className="hov lean-b max-lg:-order-1 md:col-span-2 lg:col-span-8" pageClass="flex flex-col">
      <Caption aside={picked && <span className="lg:mr-8">Rank {CARD_RANKS[rank]} · {left} {left === 1 ? 'battle' : 'battles'} left<span className="hidden sm:max-lg:inline xl:inline"> · {pool} upgrade {pool === 1 ? 'point' : 'points'} · {coins} coins</span></span>}>Your squad</Caption>
      <div className="pad p-4 lg:flex-1 lg:min-h-0 lg:py-2.5">
        {!picked ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-4 lg:py-0">
            <p className="poster text-2xl">Name your favourite and build your squad</p>
            <button onClick={() => router.push('/squad')} className="btn-spot poster text-2xl px-8 py-3 lg:py-2">Start your squad</button>
          </div>
        ) : (
          <ul className="grid grid-cols-3 sm:grid-cols-6 gap-2 lg:h-full">
            {line.map(f => (
              <li key={f.card_id} className="min-w-0 lg:min-h-0">
                <button onClick={() => router.push('/squad')}
                  aria-label={`${f.character?.name}, rank ${rankLetter(f.upgrades)}${cardNote(f, pool) ? `, ${cardNote(f, pool)[1]}` : ''}`}
                  className="hov-thumb w-full h-full flex flex-col gap-1">
                  <span data-rank={rankLetter(f.upgrades)} className="rank-frame art relative block w-full overflow-hidden aspect-[3/4] lg:aspect-auto lg:flex-1 lg:min-h-0">
                    <img src={f.character?.image_url} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                    {cardNote(f, pool) && <span className="label !text-[0.5625rem] absolute left-0 top-0 bg-[var(--spot)] !text-[#fff] px-1 py-0.5">{cardNote(f, pool)[0]}</span>}
                    <RankTag upgrades={f.upgrades} className="absolute right-0 bottom-0 text-lg" />
                  </span>
                  <span className="poster text-xs xl:text-sm block w-full text-center truncate">{f.character?.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
