'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'

const SLOT_DEFS = [
  { type: 'Champion', count: 2, points: 5, color: 'text-amber-400', border: 'border-amber-500/30 bg-amber-500/5', empty: 'border-amber-500/20' },
  { type: 'Specialist', count: 3, points: 4, color: 'text-purple-400', border: 'border-purple-500/30 bg-purple-500/5', empty: 'border-purple-500/20' },
  { type: 'Support', count: 2, points: 3, color: 'text-blue-400', border: 'border-blue-500/30 bg-blue-500/5', empty: 'border-blue-500/20' },
  { type: 'Medic', count: 1, points: 3, color: 'text-green-400', border: 'border-green-500/30 bg-green-500/5', empty: 'border-green-500/20' },
  { type: 'Sub', count: 2, points: 1, color: 'text-zinc-400', border: 'border-zinc-700/30 bg-zinc-800/30', empty: 'border-zinc-700/30' },
]

export default function Party() {
  const [party, setParty] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      let { data: partyData } = await supabase
        .from('parties')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!partyData) {
        const { data: newParty } = await supabase
          .from('parties')
          .insert({ user_id: session.user.id })
          .select()
          .single()
        partyData = newParty
      }

      setParty(partyData)

      const { data: slotData } = await supabase
        .from('party_slots')
        .select('*, characters(character_id, name, image_url, anime_title, power_type, overall, gold_cost)')
        .eq('party_id', partyData.id)

      setSlots(slotData || [])
      setLoading(false)
    }
    load()
  }, [])

  const removeCharacter = async (slotId) => {
    setRemoving(slotId)
    await supabase.from('party_slots').delete().eq('id', slotId)
    setSlots(prev => prev.filter(s => s.id !== slotId))
    setRemoving(null)
  }

  const totalGoldSpent = slots.reduce((sum, s) => sum + (s.characters?.gold_cost || 0), 0)
  const goldRemaining = 100000000 - totalGoldSpent
  const formatGold = (g) => `${(g / 1000000).toFixed(0)}M`

  const POWER_COLORS = {
    Physical: 'text-orange-400',
    Elemental: 'text-blue-400',
    Spiritual: 'text-purple-400',
    Tactical: 'text-yellow-400',
    Cursed: 'text-red-400',
    Mythic: 'text-pink-400',
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-amber-500 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold">My Party</h1>
        <p className="text-zinc-500 text-sm mt-1">Build your roster of 10 characters</p>
      </div>

      <div className="mx-5 mb-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-zinc-500 text-xs">Gold remaining</p>
          <p className={`font-bold text-xl ${goldRemaining < 0 ? 'text-red-400' : 'text-amber-400'}`}>
            {formatGold(goldRemaining)}
          </p>
        </div>
        <div className="w-px h-8 bg-zinc-800" />
        <div className="text-right">
          <p className="text-zinc-500 text-xs">Slots filled</p>
          <p className="text-white font-bold text-xl">{slots.length} / 10</p>
        </div>
        <div className="w-px h-8 bg-zinc-800" />
        <div className="text-right">
          <p className="text-zinc-500 text-xs">Gold spent</p>
          <p className="text-zinc-400 font-bold text-xl">{formatGold(totalGoldSpent)}</p>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {SLOT_DEFS.map(def => {
          const filled = slots.filter(s => s.slot_type === def.type)
          return (
            <div key={def.type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${def.color}`}>{def.type}</span>
                  <span className="text-zinc-600 text-xs">{filled.length}/{def.count}</span>
                  {def.type === 'Medic' && (
                    <span className="text-xs text-green-500/60 border border-green-500/20 px-2 py-0.5 rounded-full">cascade</span>
                  )}
                </div>
                <span className="text-zinc-600 text-xs">{def.points} pts/win</span>
              </div>

              <div className="flex flex-col gap-2">
                {Array.from({ length: def.count }).map((_, i) => {
                  const slot = filled[i]
                  return slot ? (
                    <div key={slot.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${def.border}`}>
                      <img src={slot.characters?.image_url} alt={slot.characters?.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{slot.characters?.name}</p>
                        <p className="text-zinc-500 text-xs truncate">{slot.characters?.anime_title}</p>
                        <p className={`text-xs ${POWER_COLORS[slot.characters?.power_type] || 'text-zinc-600'}`}>
                          {slot.characters?.power_type || '—'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-amber-400 text-xs">{slot.characters?.gold_cost ? formatGold(slot.characters.gold_cost) : '—'}</p>
                        <button
                          onClick={() => removeCharacter(slot.id)}
                          disabled={removing === slot.id}
                          className="text-zinc-600 text-xs mt-1 active:text-red-400 disabled:opacity-30">
                          {removing === slot.id ? '...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={`empty-${i}`}
                      onClick={() => router.push(`/characters?slot=${def.type}&position=${i + 1}&party=${party?.id}`)}
                      className={`w-full rounded-2xl border border-dashed p-3 flex items-center gap-3 active:opacity-50 transition-all ${def.empty}`}>
                      <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center text-zinc-600 text-xl flex-shrink-0">+</div>
                      <p className="text-zinc-600 text-sm">Add {def.type}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <BottomNav active="party" />
    </div>
  )
}