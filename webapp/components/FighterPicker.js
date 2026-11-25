'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const COLUMNS = 'character_id, name, image_url, power_type'

// the most loved characters first; typing searches all of them. picked: ids in the order chosen
export default function FighterPicker({ picked = [], taken = [], onPick }) {
  const [search, setSearch] = useState('')
  const [found, setFound] = useState(null)

  useEffect(() => {
    let current = true
    const wait = setTimeout(async () => {
      const term = search.trim()
      let q = supabase.from('characters').select(COLUMNS)
      if (term) q = q.ilike('name', `%${term}%`)
      const { data } = await q.order('favourites', { ascending: false }).limit(24)
      if (current) setFound(data || [])
    }, search ? 250 : 0)
    return () => { current = false; clearTimeout(wait) }
  }, [search])

  return (
    <>
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for a favourite..." aria-label="Search characters" className="field mb-3" />
      {found?.length === 0 && <p className="muted text-sm text-center py-8">No character by that name.</p>}
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {(found || []).map(c => {
          const order = picked.indexOf(c.character_id)
          const used = taken.includes(c.character_id)
          return (
            <li key={c.character_id} className="min-w-0">
              <button onClick={() => onPick(c)} disabled={used} aria-pressed={order >= 0} className="hov-thumb w-full text-left disabled:opacity-40">
                <span className={`relative block overflow-hidden border-[3px] ${order >= 0 ? 'border-[var(--spot)]' : 'border-[var(--line)]'}`}>
                  <img src={c.image_url} alt="" loading="lazy" className="block w-full aspect-[3/4] object-cover object-top" />
                  {order >= 0 && <span className="poster absolute left-0 top-0 bg-[var(--spot)] text-white text-2xl px-2 py-1">{order + 1}</span>}
                </span>
                <span className="text-xs font-semibold line-clamp-2 break-words mt-1">{c.name}</span>
                <span className="label muted block !text-[0.5625rem] mt-0.5">{used ? 'In squad' : c.power_type}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
