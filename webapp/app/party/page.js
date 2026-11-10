'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'
import PageSkeleton from '../../components/Skeleton'
import { BUDGET, SLOT_DEFS, POWER_COLORS, formatGold } from '../../lib/game'

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
  const goldRemaining = BUDGET - totalGoldSpent

  // positions are fixed per slot type, so reuse the first one nobody holds
  const firstFreePosition = (def) => {
    const taken = slots.filter(s => s.slot_type === def.type).map(s => s.slot_position)
    return Array.from({ length: def.count }, (_, i) => i + 1).find(p => !taken.includes(p))
  }

  if (loading) return <PageSkeleton variant="cards" />

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-4 enter">
        <h1 className="display text-3xl">My Party</h1>
        <p className="text-zinc-500 text-sm mt-1">Build your roster of 10 characters</p>
      </div>

      <div style={{ '--i': 1 }} className="enter mx-5 mb-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="label text-zinc-500 mb-1.5">Gold left</p>
          <p className={`num text-2xl ${goldRemaining < 0 ? 'text-red-400' : 'text-amber-400'}`}>
            {formatGold(goldRemaining)}
          </p>
        </div>
        <div className="w-px h-8 bg-zinc-800" />
        <div className="text-right">
          <p className="label text-zinc-500 mb-1.5">Slots</p>
          <p className="num text-2xl text-white">{slots.length} / 10</p>
        </div>
        <div className="w-px h-8 bg-zinc-800" />
        <div className="text-right">
          <p className="label text-zinc-500 mb-1.5">Spent</p>
          <p className="num text-2xl text-zinc-400">{formatGold(totalGoldSpent)}</p>
        </div>
      </div>

      {goldRemaining < 0 && (
        <p className="mx-5 -mt-2 mb-5 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          Over budget: this party won&apos;t score on battle night. Swap someone for a cheaper pick.
        </p>
      )}

      <div className="px-5 flex flex-col gap-5">
        {SLOT_DEFS.map((def, defIndex) => {
          const filled = slots.filter(s => s.slot_type === def.type)
          return (
            <div key={def.type} className="enter" style={{ '--i': defIndex + 2 }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`display text-base ${def.color}`}>{def.type}</span>
                  <span className="label text-zinc-500 !tracking-[0.08em]">{filled.length}/{def.count}</span>
                  {def.type === 'Medic' && (
                    <span className="hud !py-0.5 !px-2 text-green-500 border border-green-500/30">cascade</span>
                  )}
                </div>
                <span className="label text-zinc-500 !tracking-[0.08em]">{def.points} pts / win</span>
              </div>

              <div className="flex flex-col gap-2">
                {Array.from({ length: def.count }).map((_, i) => {
                  const slot = filled[i]
                  return slot ? (
                    <div key={slot.id} className={`rounded-[24px] border p-3 flex items-center gap-3 ${def.border}`}>
                      <button onClick={() => router.push(`/character?id=${slot.character_id}`)}
                        className="flex-1 min-w-0 flex items-center gap-3 text-left">
                      <img src={slot.characters?.image_url} alt={slot.characters?.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-zinc-800" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{slot.characters?.name}</p>
                        <p className="text-zinc-500 text-xs truncate">{slot.characters?.anime_title}</p>
                        <p className={`text-xs ${POWER_COLORS[slot.characters?.power_type] || 'text-zinc-500'}`}>
                          {slot.characters?.power_type || '—'} · OVR {slot.characters?.overall ?? '—'}
                        </p>
                      </div>
                      </button>
                      <div className="text-right flex-shrink-0">
                        <p className="text-amber-400 text-xs">{formatGold(slot.characters?.gold_cost)}</p>
                        <button
                          onClick={() => removeCharacter(slot.id)}
                          disabled={removing === slot.id}
                          className="text-zinc-500 text-xs mt-1 py-1 -my-1 transition-colors duration-150 active:text-red-400 disabled:opacity-30">
                          {removing === slot.id ? '...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={`empty-${i}`}
                      onClick={() => router.push(`/characters?slot=${def.type}&position=${firstFreePosition(def)}&party=${party?.id}`)}
                      className={`w-full rounded-[24px] border border-dashed p-3 flex items-center gap-3 press ${def.empty}`}>
                      <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center text-zinc-500 text-xl flex-shrink-0">+</div>
                      <p className="text-zinc-500 text-sm">Add {def.type}</p>
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