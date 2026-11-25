'use client'
import { useRouter } from 'next/navigation'
import { MAX_LEVEL, creditsOf, fightsLeft, squadLevel, xpToNext } from '../lib/squad'
import { supabase } from '../lib/supabase'
import { Panel, Caption } from './Manga'

// what Home needs to know about my squad; allTimePoints are the lineup points that become credits
export async function fetchSquad(userId) {
  const [{ data: squad }, { data: fighters }, { data: rank }] = await Promise.all([
    supabase.from('squads').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('fighters').select('*').eq('user_id', userId).in('slot', [1, 2, 3]).order('slot'),
    supabase.from('user_ranks').select('all_time_points').eq('user_id', userId).maybeSingle(),
  ])
  const ids = (fighters || []).map(f => f.character_id)
  const { data: chars } = ids.length
    ? await supabase.from('characters').select('character_id, name, image_url').in('character_id', ids)
    : { data: [] }
  const today = new Date().toISOString().slice(0, 10)
  const line = (fighters || []).map(f => ({ ...f, character: chars.find(c => c.character_id === f.character_id) }))
  return {
    line,
    level: squadLevel(line),
    left: fightsLeft(squad, today),
    fought: squad?.day === today && squad.fights > 0,
    unspent: line.reduce((n, f) => n + f.points, 0),
    credits: creditsOf(rank?.all_time_points, squad),
  }
}

// the main game, front and centre on Home
export default function HomeSquad({ squad }) {
  const router = useRouter()
  const { line, level, left, credits } = squad
  const picked = line.length > 0

  return (
    <Panel i={2} className="hov lean-b max-lg:-order-1 md:col-span-2 lg:col-span-8" pageClass="flex flex-col">
      <Caption aside={picked && <span className="lg:mr-8">Lv {level} · {left} {left === 1 ? 'battle' : 'battles'} left<span className="hidden sm:inline"> · {credits} credits</span></span>}>Your squad</Caption>
      <div className="pad p-4 lg:flex-1 lg:min-h-0 lg:py-2.5">
        {!picked ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-4 lg:py-0">
            <p className="poster text-2xl">Pick three favourites and raise them</p>
            <button onClick={() => router.push('/squad')} className="btn-spot poster text-2xl px-8 py-3 lg:py-2">Pick your squad</button>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2 lg:h-full">
            {line.map(f => (
              <li key={f.character_id} className="min-w-0 lg:min-h-0">
                <button onClick={() => router.push('/squad')}
                  aria-label={`${f.character?.name}, level ${f.level}${f.points ? `, ${f.points} points to spend` : ''}`}
                  className="hov-thumb w-full h-full flex flex-col lg:flex-row text-left border-2 border-[var(--line)]">
                  <span className="art relative block overflow-hidden aspect-[3/4] lg:aspect-auto lg:h-full lg:w-[40%] xl:w-1/2 flex-shrink-0">
                    <img src={f.character?.image_url} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 p-2 lg:p-1.5">
                    <span className="poster text-base xl:text-lg line-clamp-2 break-words">{f.character?.name}</span>
                    <span className="label muted !text-[0.625rem]">Lv {f.level}</span>
                    <span aria-hidden="true" className="block h-2 bg-[color-mix(in_oklab,var(--ink)_15%,transparent)]">
                      <span className="block h-full bg-[var(--spot)]" style={{ width: `${f.level < MAX_LEVEL ? f.xp / xpToNext(f.level) * 100 : 100}%` }} />
                    </span>
                    {f.points > 0 && <span className="label !text-[0.625rem] bg-[var(--spot)] text-white px-1.5 py-1 self-start">Spend {f.points}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
