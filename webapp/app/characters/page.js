'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { BUDGET, POWER_TYPES, POWER_HEX, formatGold } from '../../lib/game'
import { Screen, PageHead } from '../../components/Manga'
import PageSkeleton, { Sk } from '../../components/Skeleton'

const FILTERS = ['All', ...POWER_TYPES]

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
  const [goldLeft, setGoldLeft] = useState(BUDGET)
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
          .select('character_id, characters(gold_cost)')
          .eq('party_id', parseInt(partyId))
        setPartyCharIds((existingSlots || []).map(s => s.character_id))
        setGoldLeft(BUDGET - (existingSlots || []).reduce((sum, s) => sum + (s.characters?.gold_cost || 0), 0))
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
    if (!isSelecting || character.gold_cost > goldLeft) return
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

  return (
    <Screen nav={isSelecting ? null : 'characters'}>
      <PageHead title="Characters" back={isSelecting ? '/party' : undefined} backLabel="Party"
        sub={isSelecting ? `Picking ${slotType}, slot ${slotPosition} · ${formatGold(goldLeft)} gold left` : 'Scout fighters for your party'} />

      <input
        type="search"
        placeholder="Search by name..."
        aria-label="Search by name"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="field mb-3"
      />

      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3">
        {FILTERS.map(pt => (
          <button key={pt} onClick={() => setFilter(pt)} aria-pressed={filter === pt}
            className="btn flex-shrink-0 text-base px-4 py-2.5">
            {pt}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton-wrap grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" role="status" aria-label="Loading">
          {Array.from({ length: 10 }, (_, i) => <Sk key={i} className="aspect-[3/4]" style={{ animationDelay: `${i * 80}ms` }} />)}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {characters.map(char => {
              const alreadyIn = partyCharIds.includes(char.character_id)
              return (
                <li key={char.character_id} className="box hov-card flex flex-col min-w-0">
                  <button onClick={() => router.push(`/character?id=${char.character_id}`)} className="art press relative block text-left">
                    <span className="block overflow-hidden border-b-[3px] border-[var(--line)]">
                      <img src={char.image_url} alt="" loading="lazy" className={`block w-full aspect-[3/4] object-cover object-top ${alreadyIn ? 'brightness-50' : ''}`} />
                    </span>
                    <span className="tag poster text-lg left-0 top-0"><span className="sr-only">Rated </span>{char.overall || '—'}</span>
                    <span className="block px-2.5 pt-2">
                      <span className="poster block text-lg truncate">{char.name}</span>
                      <span className="block muted text-xs truncate mt-1">{char.anime_title}</span>
                    </span>
                  </button>
                  <div className="px-2.5 pt-2 pb-2.5 mt-auto" style={{ '--tc': POWER_HEX[char.power_type] || '#71717a' }}>
                    <div className="flex items-end justify-between gap-2">
                      <span className="label type-text !text-[0.6875rem] truncate">{char.power_type || '—'}</span>
                      <span className="poster text-xl">{formatGold(char.gold_cost)}</span>
                    </div>
                    <p className="label muted !text-[0.625rem] mt-1">{formatFavs(char.favourites)} favs</p>
                    {isSelecting && (
                      alreadyIn ? <p className="label muted text-center py-2.5 mt-2">In your party</p>
                        : char.gold_cost > goldLeft ? <p className="label muted text-center py-2.5 mt-2">Too pricey</p>
                        : (
                          <button onClick={() => addToParty(char)} disabled={adding === char.character_id}
                            className="btn-spot press text-lg w-full py-2 mt-2">
                            {adding === char.character_id ? '…' : 'Pick'}
                          </button>
                        )
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {characters.length === 0 && <p className="box muted text-sm text-center py-16">No characters found</p>}

          {hasMore && (
            <div className="flex justify-center py-6">
              <button onClick={loadMore} disabled={loadingMore} className="btn bg-[var(--panel)] text-xl px-8 py-3">
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </Screen>
  )
}

export default function Characters() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <CharactersContent />
    </Suspense>
  )
}