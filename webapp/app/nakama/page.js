'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { fetchMe, byPoints } from '../../lib/social'
import { fetchAvatars } from '../../lib/avatar'
import PageSkeleton from '../../components/Skeleton'
import { Screen, PageHead } from '../../components/Manga'
import { PlayerList, PlayerSheet, Empty } from '../../components/Players'

export default function Nakama() {
  const [me, setMe] = useState(null)
  const [friends, setFriends] = useState([])
  const [found, setFound] = useState([])
  const [search, setSearch] = useState('')
  const [avatars, setAvatars] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const load = async () => {
    const mine = await fetchMe()
    if (!mine) { router.push('/'); return }
    const { data: links } = await supabase.from('nakama').select('nakama_id').eq('user_id', mine.user_id)
    const ids = (links || []).map(l => l.nakama_id)
    const { data } = ids.length ? await byPoints().in('user_id', ids) : { data: [] }
    setMe(mine)
    setFriends(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAvatars().then(setAvatars); load() }, [])

  // search as they type, after a short pause
  useEffect(() => {
    const term = search.trim()
    if (term.length < 2) { setFound([]); return }
    let current = true
    const wait = setTimeout(async () => {
      const { data } = await byPoints().ilike('username', `%${term}%`).limit(10)
      if (current) setFound(data || [])
    }, 250)
    return () => { current = false; clearTimeout(wait) }
  }, [search])

  if (loading) return <PageSkeleton variant="list" />

  const searching = search.trim().length >= 2

  return (
    <Screen nav="nakama" width="max-w-3xl">
      <PageHead title="Nakama" sub="Your comrades. Tap one to spar or fight." />
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a player by name..."
        aria-label="Find a player by name" className="field mb-3" />
      {searching ? (
        found.length ? <PlayerList rows={found} me={me.user_id} avatars={avatars} onOpen={setSelected} /> : <Empty>No player by that name.</Empty>
      ) : friends.length ? (
        <PlayerList rows={friends} me={me.user_id} avatars={avatars} onOpen={setSelected} />
      ) : <Empty>No nakama yet. Search for a player above and add them.</Empty>}
      {selected && <PlayerSheet key={selected.user_id} player={selected} me={me.user_id} avatars={avatars} onClose={() => setSelected(null)} onChange={load} />}
    </Screen>
  )
}
