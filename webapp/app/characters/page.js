'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

const POWER_TYPES = ['All', 'Physical', 'Elemental', 'Spiritual', 'Tactical', 'Cursed', 'Mythic']

const POWER_COLORS = {
  Physical: 'bg-orange-500/20 text-orange-400',
  Elemental: 'bg-blue-500/20 text-blue-400',
  Spiritual: 'bg-purple-500/20 text-purple-400',
  Tactical: 'bg-yellow-500/20 text-yellow-400',
  Cursed: 'bg-red-500/20 text-red-400',
  Mythic: 'bg-pink-500/20 text-pink-400',
}

function CharactersContent() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [adding, setAdding] = useState(null)
  const [partyCharIds, setPartyCharIds] = useState([])
  const router = useRouter()
  const searchParams = useSearchParams()

  const slotType = searchParams.get('slot')
  const slotPosition = searchParams.get('position')
  const partyId = searchParams.get('party')
  const isSelecting = !!slotType

  const fetchCharacters = async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    let query = supabase
      .from('characters')
      .select('character_id, name, image_url, anime_title, power_type, overall, gold_cost, favourites')
      .order('favourites', { ascending: false })
      .range(currentOffset, currentOffset + 49)

    if (search) query = query.ilike('name', `%${search}%`)
    if (filter !== 'All') query = query.eq('power_type', filter)

    const { data } = await query
    const results = data || []

    if (reset) {
      setCharacters(results)
      setOffset(50)
    } else {
      setCharacters(prev => [...prev, ...results])
      setOffset(prev => prev + 50)
    }

    setHasMore(results.length === 50)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      if (partyId) {
        const { data: existingSlots } = await supabase
          .from('party_slots')
          .select('character_id')
          .eq('party_id', parseInt(partyId))
        setPartyCharIds((existingSlots || []).map(s => s.character_id))
      }

      await fetchCharacters(true)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCharacters(true).then(() => setLoading(false))
  }, [search, filter])

  const loadMore = async () => {
    setLoadingMore(true)
    await fetchCharacters(false)
    setLoadingMore(false)
  }

  const addToParty = async (character) => {
    if (!isSelecting) return
    setAdding(character.character_id)

    const { error } = await supabase.from('party_slots').insert({
      party_id: parseInt(partyId),
      character_id: character.character_id,
      slot_type: slotType,
      slot_position: parseInt(slotPosition),
      gameweek: null,
    })

    if (error) {
      setAdding(null)
      alert('Could not add character. They may already be in your party.')
      return
    }

    router.push('/party')
  }

  const formatFavs = (f) => f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${f}`
  const formatGold = (g) => g ? `${(g / 1000000).toFixed(0)}M` : '—'

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-1">
          {isSelecting && (
            <button onClick={() => router.push('/party')} className="text-zinc-500 text-sm">← Back</button>
          )}
          <h1 className="text-2xl font-bold">Characters</h1>
        </div>
        {isSelecting && (
          <p className="text-amber-500 text-sm">Selecting {slotType} — slot {slotPosition}</p>
        )}
      </div>

      <div className="px-5 mb-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-3 text-sm outline-none border border-zinc-800 focus:border-amber-500 transition-colors placeholder:text-zinc-600"
        />
      </div>

      <div className="px-5 mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {POWER_TYPES.map(pt => (
          <button key={pt} onClick={() => setFilter(pt)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === pt ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            {pt}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-amber-500 text-sm">Loading...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80">
                <th className="text-left text-zinc-500 text-xs font-medium px-5 py-3 w-[200px]">Character</th>
                <th className="text-left text-zinc-500 text-xs font-medium px-3 py-3">Type</th>
                <th className="text-right text-zinc-500 text-xs font-medium px-3 py-3">OVR</th>
                <th className="text-right text-zinc-500 text-xs font-medium px-3 py-3">Cost</th>
                <th className="text-right text-zinc-500 text-xs font-medium px-3 py-3">Favs</th>
                {isSelecting && <th className="px-3 py-3 w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {characters.map(char => {
                const alreadyIn = partyCharIds.includes(char.character_id)
                return (
                  <tr key={char.character_id} className={`border-b border-zinc-900 ${alreadyIn ? 'opacity-30' : 'hover:bg-zinc-900/40'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={char.image_url} alt={char.name}
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-zinc-800" />
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate max-w-[110px]">{char.name}</p>
                          <p className="text-zinc-600 text-xs truncate max-w-[110px]">{char.anime_title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {char.power_type ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${POWER_COLORS[char.power_type] || 'bg-zinc-800 text-zinc-400'}`}>
                          {char.power_type}
                        </span>
                      ) : <span className="text-zinc-700 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-white">{char.overall || '—'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-amber-400">{formatGold(char.gold_cost)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-zinc-400">{formatFavs(char.favourites)}</span>
                    </td>
                    {isSelecting && (
                      <td className="px-3 py-3">
                        {!alreadyIn && (
                          <button
                            onClick={() => addToParty(char)}
                            disabled={adding === char.character_id}
                            className="bg-amber-500 text-black text-xs font-bold px-3 py-2 rounded-xl active:scale-95 disabled:opacity-50 transition-all whitespace-nowrap">
                            {adding === char.character_id ? '...' : 'Pick'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {characters.length === 0 && (
            <div className="text-center py-20">
              <p className="text-zinc-600 text-sm">No characters found</p>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center py-8">
              <button onClick={loadMore} disabled={loadingMore}
                className="text-amber-500 text-sm border border-amber-500/30 px-6 py-2.5 rounded-full active:scale-95 disabled:opacity-50 transition-all">
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {!isSelecting && <BottomNav active="characters" />}
    </div>
  )
}

export default function Characters() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-amber-500 text-sm">Loading...</p>
      </div>
    }>
      <CharactersContent />
    </Suspense>
  )
}