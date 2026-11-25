'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CharacterTile from './CharacterTile'

const COLUMNS = 'character_id, name, image_url, power_type, anime_title'

// the most loved characters first, of one anime or of all; typing searches all of them
export default function FighterPicker({ anime, onPick }) {
  const [search, setSearch] = useState('')
  const [found, setFound] = useState(null)

  useEffect(() => {
    let current = true
    const wait = setTimeout(async () => {
      const term = search.trim()
      let q = supabase.from('characters').select(COLUMNS)
      if (term) q = q.ilike('name', `%${term}%`)
      else if (anime) q = q.eq('anime_title', anime)
      const { data } = await q.order('favourites', { ascending: false }).limit(24)
      if (current) setFound(data || [])
    }, search ? 250 : 0)
    return () => { current = false; clearTimeout(wait) }
  }, [search, anime])

  return (
    <>
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search every character..." aria-label="Search characters" className="field mb-3" />
      {found?.length === 0 && <p className="muted text-sm text-center py-8">No character by that name.</p>}
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {(found || []).map(c => (
          <li key={c.character_id} className="min-w-0">
            <CharacterTile character={c} note={search ? c.anime_title : c.power_type} onClick={() => onPick(c)} />
          </li>
        ))}
      </ul>
    </>
  )
}
