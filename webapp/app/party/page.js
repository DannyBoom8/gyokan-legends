'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'
import Icon from '../../components/Icon'
import PageSkeleton from '../../components/Skeleton'
import { BUDGET, SLOT_DEFS, POWER_HEX, formatGold } from '../../lib/game'

export default function Party() {
  const [party, setParty] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)
  const [view, setView] = useState('formation')
  const [active, setActive] = useState(null)
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
        .select('*, characters(character_id, name, image_url, anime_title, power_type, overall, gold_cost, strength, speed, defence, technique, magic, iq, aura)')
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

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && setActive(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const change = async (slot, def) => {
    const pos = slot.slot_position
    await removeCharacter(slot.id)
    router.push(`/characters?slot=${def.type}&position=${pos}&party=${party?.id}`)
  }

  const totalGoldSpent = slots.reduce((sum, s) => sum + (s.characters?.gold_cost || 0), 0)
  const goldRemaining = BUDGET - totalGoldSpent

  // positions are fixed per slot type, so reuse the first one nobody holds
  const firstFreePosition = (def) => {
    const taken = slots.filter(s => s.slot_type === def.type).map(s => s.slot_position)
    return Array.from({ length: def.count }, (_, i) => i + 1).find(p => !taken.includes(p))
  }


  const STATS = [['STR', 'strength'], ['SPD', 'speed'], ['DEF', 'defence'], ['TEC', 'technique'], ['MAG', 'magic'], ['IQ', 'iq'], ['AUR', 'aura']]
  let tokenN = 0
  const token = (def, i) => {
    const slot = slots.filter(x => x.slot_type === def.type)[i]
    const c = slot?.characters
    const n = tokenN++
    if (!slot) return (
      <button key={`${def.type}-${i}`} onClick={() => router.push(`/characters?slot=${def.type}&position=${firstFreePosition(def)}&party=${party?.id}`)}
        className={`enter press flex flex-col items-center gap-1.5 w-[88px] sm:w-[104px] ${def.color}`} style={{ '--i': n }}>
        <span className="cut-sm w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] border border-dashed border-current/50 flex items-center justify-center"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, color-mix(in oklab, currentColor 8%, transparent) 0 8px, transparent 8px 16px)' }}>
          <Icon name="plus" size={24} />
        </span>
        <span className="label !text-[0.6875rem]">Recruit</span>
      </button>
    )
    const tc = POWER_HEX[c?.power_type] || '#71717a'
    const open = active === slot.id
    return (
      <div key={slot.id} className="relative" style={{ '--tc': tc }}
        onMouseEnter={() => canHover() && setActive(slot.id)}
        onMouseLeave={() => canHover() && setActive(a => a === slot.id ? null : a)}>
        <button onClick={() => setActive(a => (a === slot.id && !canHover()) ? null : slot.id)} aria-expanded={open}
          onFocus={() => canHover() && setActive(slot.id)}
          className="enter press lift flex flex-col items-center gap-1.5 w-[88px] sm:w-[104px]" style={{ '--i': n }}>
          <span className="relative cut-sm p-[3px]" style={{ background: `linear-gradient(160deg, ${tc}, ${tc}22)`, boxShadow: open ? `0 0 22px ${tc}88` : 'none' }}>
            <img src={c?.image_url} alt="" className="cut-sm w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] object-cover object-top bg-zinc-800" />
            <span className="display absolute -right-0.5 -bottom-0.5 text-[12px] leading-none px-1.5 py-[3px] text-on-accent num" style={{ background: tc }}>{c?.overall}</span>
          </span>
          <span className="display text-[11px] sm:text-xs uppercase leading-tight text-center line-clamp-2 max-w-full">{c?.name}</span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/60 md:hidden" onClick={() => setActive(null)} />
            <div role="dialog" aria-label={c?.name}
              className="pop-in fixed inset-x-3 bottom-3 z-[60] pb-safe md:absolute md:inset-x-auto md:bottom-auto md:top-full md:pb-0 md:mt-1 md:left-1/2 md:-translate-x-1/2 md:w-72 md:z-40">
              <div className="frame cut" style={{ '--frame': `color-mix(in oklab, ${tc} 50%, var(--color-zinc-800))` }}>
                <div className="inner cut p-4" style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${tc} 16%, var(--color-zinc-950)), var(--color-zinc-950) 60%)` }}>
                  <div className="flex gap-3">
                    <img src={c?.image_url} alt="" className="cut-sm w-16 h-16 object-cover object-top bg-zinc-800 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="display uppercase leading-tight">{c?.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{c?.anime_title}</p>
                      <p className="label !text-[0.6875rem] mt-1.5" style={{ color: tc }}>{c?.power_type} · OVR {c?.overall} · {formatGold(c?.gold_cost)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mt-3.5">
                    {STATS.map(([lab, key]) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <div className="h-12 w-full bg-zinc-900 flex items-end"><div className="w-full" style={{ height: `${c?.[key] ?? 0}%`, background: tc }} /></div>
                        <span className="num text-[11px] leading-none">{c?.[key]}</span>
                        <span className="label !text-[0.5625rem] !tracking-[0.06em]">{lab}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <button onClick={() => router.push(`/character?id=${slot.character_id}`)} className="press label !text-[0.75rem] bg-amber-500 text-on-accent py-2.5 cut-sm">Profile</button>
                    <button onClick={() => change(slot, def)} disabled={removing === slot.id} className="press label !text-[0.75rem] border border-zinc-700 py-2.5 disabled:opacity-40">Change</button>
                    <button onClick={() => { removeCharacter(slot.id); setActive(null) }} className="press label !text-[0.75rem] border border-zinc-700 text-red-400 py-2.5">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const row = (type, label) => {
    const def = SLOT_DEFS.find(d => d.type === type)
    return (
      <div key={type} className="flex flex-col items-center gap-3">
        <p className={`label !text-[0.6875rem] ${def.color}`}>{label} · {def.points} pts / win</p>
        <div className="flex justify-center gap-3 sm:gap-6">
          {Array.from({ length: def.count }, (_, i) => token(def, i))}
        </div>
      </div>
    )
  }

  const formationView = (
    <div className="relative">
      <div className="arena absolute inset-0 border border-zinc-800 cut" aria-hidden="true" />
      <div className="relative flex flex-col gap-7 py-7 px-3 sm:py-9">
        {row('Champion', 'Front line · Champions')}
        {row('Specialist', 'Strike · Specialists')}
        {row('Support', 'Wings · Support')}
        {row('Medic', 'Medic · cascade')}
        <div className="border-t border-dashed border-zinc-800 pt-6 mx-4">{row('Sub', 'Bench · Subs')}</div>
      </div>
    </div>
  )

  if (loading) return <PageSkeleton variant="cards" />

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12"><div className="md:max-w-6xl md:mx-auto">
      <div className="px-5 md:px-8 pt-14 pb-4 enter flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl md:text-4xl uppercase">My Party</h1>
          <p className="text-zinc-500 text-sm mt-1">Build your roster of 10 characters</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-xl" role="tablist" aria-label="Party view">
          {[['formation', 'Formation'], ['list', 'List']].map(([id, lab]) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => { setView(id); setActive(null) }}
              className={`label !text-[0.75rem] px-3.5 py-2 rounded-lg transition-colors duration-150 ${view === id ? 'bg-amber-500 text-on-accent' : 'text-zinc-500'}`}>{lab}</button>
          ))}
        </div>
      </div>

      <div style={{ '--i': 1 }} className="enter mx-5 md:mx-8 mb-5 bg-zinc-900 border border-zinc-800 border-t-2 border-t-amber-500 cut-sm p-4 flex items-center justify-between">
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

      <div className="mx-5 md:mx-8 -mt-3 mb-5 h-2 bg-zinc-900 border border-zinc-800 overflow-hidden" aria-hidden="true">
        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 origin-left transition-[scale] duration-500 ease-out" style={{ scale: `${Math.min(100, Math.max(0, (totalGoldSpent / BUDGET) * 100)) / 100} 1`, boxShadow: '0 0 12px rgb(245 158 11 / 0.5)' }} />
      </div>

      {goldRemaining < 0 && (
        <p className="mx-5 md:mx-8 -mt-2 mb-5 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          Over budget: this party won&apos;t score on battle night. Swap someone for a cheaper pick.
        </p>
      )}

      <div className="px-5 md:px-8">{view === 'formation' && formationView}</div>
      {view === 'list' && <div className="px-5 md:px-8 grid md:grid-cols-2 gap-5 items-start">
        {SLOT_DEFS.map((def, defIndex) => {
          const filled = slots.filter(s => s.slot_type === def.type)
          return (
            <div key={def.type} className="enter" style={{ '--i': defIndex + 2 }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`display text-base uppercase border-l-4 border-current pl-2.5 leading-none ${def.color}`}>{def.type}</span>
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
                    <div key={slot.id} className="enter lift" style={{ '--i': defIndex + 3 + i, '--tc': POWER_HEX[slot.characters?.power_type] || '#71717a', '--frame': 'color-mix(in oklab, var(--tc) 35%, var(--color-zinc-800))' }}>
                    <div className="frame cut">
                    <div className="inner cut relative flex items-center gap-3 py-3 pl-4 pr-3.5" style={{ background: 'linear-gradient(100deg, color-mix(in oklab, var(--tc) 14%, var(--color-zinc-950)), var(--color-zinc-950) 70%)' }}>
                      <span className="edge-glow absolute left-0 inset-y-0 w-1" style={{ background: 'var(--tc)' }} />
                      <button onClick={() => router.push(`/character?id=${slot.character_id}`)}
                        className="press flex-1 min-w-0 flex items-center gap-3 text-left">
                        <span className="relative flex-shrink-0">
                          <img src={slot.characters?.image_url} alt={slot.characters?.name}
                            className="cut-sm w-[72px] h-[72px] object-cover object-top bg-zinc-800" />
                          <span className="display absolute -right-0.5 -bottom-0.5 text-[13px] leading-none px-1.5 py-[3px] text-on-accent num" style={{ background: 'var(--tc)' }}>{slot.characters?.overall ?? '—'}</span>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="display block text-base uppercase truncate">{slot.characters?.name}</span>
                          <span className="block text-zinc-500 text-xs truncate mt-0.5">{slot.characters?.anime_title}</span>
                          <span className="label inline-block mt-1.5 rounded px-2 py-0.5 !text-[0.6875rem] border" style={{ color: 'var(--tc)', borderColor: 'color-mix(in oklab, var(--tc) 40%, transparent)' }}>{slot.characters?.power_type || '—'}</span>
                        </span>
                      </button>
                      <div className="self-stretch flex flex-col items-end justify-between flex-shrink-0">
                        <p className="display text-amber-400 text-sm num">{formatGold(slot.characters?.gold_cost)}</p>
                        <button
                          onClick={() => removeCharacter(slot.id)}
                          disabled={removing === slot.id}
                          className="text-zinc-500 text-xs py-1 -my-1 transition-colors duration-150 active:text-red-400 disabled:opacity-30">
                          {removing === slot.id ? '...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                    </div>
                    </div>
                  ) : (
                    <button
                      key={`empty-${i}`}
                      onClick={() => router.push(`/characters?slot=${def.type}&position=${firstFreePosition(def)}&party=${party?.id}`)}
                      className={`cut press w-full border border-dashed p-3 pl-4 flex items-center gap-3 min-h-[78px] ${def.color} ${def.empty}`}
                      style={{ backgroundImage: 'repeating-linear-gradient(135deg, color-mix(in oklab, currentColor 7%, transparent) 0 8px, transparent 8px 16px)' }}>
                      <span className="w-[72px] h-[72px] border border-dashed border-current/40 flex items-center justify-center flex-shrink-0">
                        <Icon name="plus" size={26} />
                      </span>
                      <span className="display text-sm uppercase tracking-[0.12em]">Recruit {def.type}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>}
      </div>

      <BottomNav active="party" />
    </div>
  )
}