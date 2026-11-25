'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Arena from './Arena'

// the one-on-one bouts inside a war or cup match, each watchable. a is on the left in the replay too.
export default function Bouts({ bouts, names, me, label, note }) {
  const [watching, setWatching] = useState(null)

  const watch = async ({ a, b, battle }) => {
    const ids = [...battle.a.fighters, ...battle.b.fighters].map(f => f.character_id)
    const { data: chars } = await supabase.from('characters').select('character_id, name, image_url, power_type').in('character_id', ids)
    setWatching({
      result: battle, home: a === me ? null : names[a], rival: names[b],
      chars: Object.fromEntries(chars.map(c => [c.character_id, c])),
    })
  }

  return (
    <>
      <ol className="divide-y-2 divide-current/20 border-t-[3px] border-[var(--line)]">
        {bouts.map((x, i) => (
          <li key={i} className="flex items-center gap-3 p-3">
            <p className="flex-1 min-w-0 text-sm break-words">
              <span className={x.winner === 'a' ? 'font-bold' : 'muted'}>{names[x.a] || 'No one'}</span>
              <span className="muted"> vs </span>
              <span className={x.winner === 'b' ? 'font-bold' : 'muted'}>{names[x.b] || 'No one'}</span>
              <span className="label muted !whitespace-normal block mt-1">{note?.(x) || `${names[x.winner === 'a' ? x.a : x.b]} wins`}{!x.battle && ' · unmatched'}</span>
            </p>
            {x.battle && <button onClick={() => watch(x)} aria-label={`Watch ${names[x.a]} against ${names[x.b]}`} className="btn text-sm px-3 py-2 flex-shrink-0">Watch</button>}
          </li>
        ))}
      </ol>
      {watching && <Arena {...watching} label={label} onClose={() => setWatching(null)} />}
    </>
  )
}
