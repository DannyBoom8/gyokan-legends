'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { POWER_TYPES } from '../lib/game'
import { SQUAD_SIZE } from '../lib/squad'
import CharacterTile from './CharacterTile'
import FighterPicker from './FighterPicker'

// anime by name, the ones with the most loved characters first
function AnimePicker({ onPick }) {
  const [search, setSearch] = useState('')
  const [found, setFound] = useState(null)

  useEffect(() => {
    let current = true
    const wait = setTimeout(async () => {
      let q = supabase.from('characters').select('anime_title')
      if (search.trim()) q = q.ilike('anime_title', `%${search.trim()}%`)
      const { data } = await q.order('favourites', { ascending: false }).limit(300)
      if (current) setFound([...new Set((data || []).map(c => c.anime_title).filter(Boolean))].slice(0, 18))
    }, search ? 250 : 0)
    return () => { current = false; clearTimeout(wait) }
  }, [search])

  return (
    <>
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for an anime..." aria-label="Search anime" className="field mb-3" />
      {found?.length === 0 && <p className="muted text-sm text-center py-4">No anime by that name yet.</p>}
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {(found || []).map(title => (
          <li key={title}><button onClick={() => onPick(title)} className="btn text-base w-full h-full min-h-12 px-3 py-2 break-words">{title}</button></li>
        ))}
      </ul>
      <button onClick={() => onPick('')} className="underline text-sm font-semibold mt-4 min-h-9">Can&apos;t find it? Search for your character instead</button>
    </>
  )
}

// a new player's three questions: favourite anime, favourite character, then one of three for every other type
export default function StartCards({ busy, error, onStart }) {
  const [anime, setAnime] = useState(null) // null until answered; '' when skipped
  const [favourite, setFavourite] = useState(null)
  const [offers, setOffers] = useState(null)
  const [picks, setPicks] = useState({})
  const [failed, setFailed] = useState('')

  // drawn once per player, so going back and forth shows the same choices
  const loadOffers = async () => {
    const { data, error } = await supabase.rpc('squad_offers')
    if (error) return setFailed(error.message)
    const { data: chars } = await supabase.from('characters').select('character_id, name, image_url, power_type').in('character_id', Object.values(data).flat())
    setOffers(Object.fromEntries(Object.entries(data).map(([type, ids]) => [type, ids.map(id => chars.find(c => c.character_id === id)).filter(Boolean)])))
  }

  const go = (next) => { next(); window.scrollTo(0, 0) }
  const choose = (c) => go(() => { setFavourite(c); setPicks({}); if (!offers) loadOffers() })

  const step = anime === null ? 1 : !favourite ? 2 : 3
  const title = ['What is your favourite anime?', 'Who is your favourite character?', 'Pick the rest of your squad'][step - 1]
  const types = POWER_TYPES.filter(t => t !== favourite?.power_type)
  const chosen = types.filter(t => picks[t]).length

  return (
    <>
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="label muted">Step {step} of 3</p>
          <h2 className="poster text-2xl sm:text-3xl mt-1" aria-live="polite">{title}</h2>
        </div>
        {step > 1 && <button onClick={() => go(() => step === 3 ? setFavourite(null) : setAnime(null))} className="btn text-sm px-3 py-2 flex-shrink-0">Back</button>}
      </div>
      {(error || failed) && <p role="alert" className="box text-sm font-semibold px-4 py-3 mb-3" style={{ color: 'var(--spot-text)' }}>{error || failed}</p>}

      {step === 1 && <AnimePicker onPick={title => go(() => setAnime(title))} />}

      {step === 2 && (
        <>
          <p className="muted text-sm mb-3">{anime ? `${anime}. ` : ''}Your favourite joins your squad straight away, as an E rank card like every other.</p>
          <FighterPicker anime={anime} onPick={choose} />
        </>
      )}

      {step === 3 && (
        <>
          <div className="box flex items-center gap-3 p-3 mb-3">
            <img src={favourite.image_url} alt="" className="w-14 h-16 object-cover object-top border-2 border-[var(--line)]" />
            <p className="min-w-0 text-sm"><span className="poster text-xl block break-words">{favourite.name}</span>Your favourite · {favourite.power_type}</p>
          </div>
          <p className="muted text-sm mb-3">A squad takes one card of each type. Here are three of each of the others.</p>
          {!offers && !failed && <p className="muted text-sm py-6 text-center">Drawing your choices...</p>}
          {offers && types.map(type => (
            <fieldset key={type} className="mb-4">
              <legend className="poster text-xl mb-2">{type}</legend>
              <ul className="grid grid-cols-3 gap-2 max-w-md">
                {offers[type].map(c => (
                  <li key={c.character_id} className="min-w-0">
                    <CharacterTile character={c} chosen={picks[type] === c.character_id} onClick={() => setPicks(p => ({ ...p, [type]: c.character_id }))} />
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
          <div className="box sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-3 z-10 flex items-center gap-3 p-3">
            <p className="flex-1 min-w-0 text-sm font-semibold" role="status">{chosen + 1} of {SQUAD_SIZE} cards chosen</p>
            <button onClick={() => onStart({ p_favourite: favourite.character_id, p_picks: types.map(t => picks[t]), p_anime: anime || null })}
              disabled={busy || chosen < types.length} className="btn-spot text-lg px-5 py-3 flex-shrink-0">Start</button>
          </div>
        </>
      )}
    </>
  )
}
