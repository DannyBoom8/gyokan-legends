'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Icon from '../../components/Icon'
import { Screen, PageHead, Caption } from '../../components/Manga'
import PageSkeleton from '../../components/Skeleton'
import { BUDGET, SLOT_DEFS, POWER_HEX, formatGold } from '../../lib/game'

export default function Lineup() {
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
    router.push(`/characters?slot=${def.type}&position=${pos}&lineup=${party?.id}`)
  }

  const totalGoldSpent = slots.reduce((sum, s) => sum + (s.characters?.gold_cost || 0), 0)
  const goldRemaining = BUDGET - totalGoldSpent

  // positions are fixed per slot type, so reuse the first one nobody holds
  const firstFreePosition = (def) => {
    const taken = slots.filter(s => s.slot_type === def.type).map(s => s.slot_position)
    return Array.from({ length: def.count }, (_, i) => i + 1).find(p => !taken.includes(p))
  }


  const STATS = [['STR', 'strength'], ['SPD', 'speed'], ['DEF', 'defence'], ['TEC', 'technique'], ['MAG', 'magic'], ['IQ', 'iq'], ['AUR', 'aura']]
  // `place` says which way the desktop popover opens, so it never leaves the screen
  const frame = 'absolute top-0 h-full left-1/2 -translate-x-1/2 aspect-square md:aspect-[4/5] max-w-full'
  const token = (def, i, place) => {
    const slot = slots.filter(x => x.slot_type === def.type)[i]
    const c = slot?.characters
    const medic = def.type === 'Medic'
    const cell = 'relative flex flex-col justify-center min-h-0 w-[min(28%,10.5rem)]'
    const tall = 'w-full h-full max-h-[14rem] flex flex-col gap-1'
    if (!slot) return (
      <div key={`${def.type}-${i}`} className={cell}>
        <button onClick={() => router.push(`/characters?slot=${def.type}&position=${firstFreePosition(def)}&lineup=${party?.id}`)}
          aria-label={`Recruit ${def.type}`} className={`hov-thumb press ${tall}`}>
          <span className="relative flex-1 min-h-0">
            <span className={`${frame} border-2 border-dashed border-[var(--line)] bg-[var(--panel)] flex items-center justify-center muted`}>
              <Icon name="plus" size={24} />
            </span>
          </span>
          <span className="label muted !text-[0.625rem] block truncate">{def.type}</span>
        </button>
      </div>
    )
    const tc = POWER_HEX[c?.power_type] || '#71717a'
    const open = active === slot.id
    return (
      <div key={slot.id} className={cell} style={{ '--tc': tc }}
        onMouseEnter={() => canHover() && setActive(slot.id)}
        onMouseLeave={() => canHover() && setActive(a => a === slot.id ? null : a)}>
        <button onClick={() => setActive(a => (a === slot.id && !canHover()) ? null : slot.id)} aria-expanded={open}
          onFocus={() => canHover() && setActive(slot.id)}
          aria-label={`${c?.name}, ${def.type}, rated ${c?.overall}`}
          className={`art hov-thumb press ${tall}`}>
          <span className="relative flex-1 min-h-0">
            <span className={`${frame} border-[3px] bg-[var(--panel)] ${open ? 'border-[var(--spot)]' : 'border-[var(--line)]'}`}>
            <span className="absolute inset-0 overflow-hidden">
              <img src={c?.image_url} alt="" className="w-full h-full object-cover object-top" />
            </span>
            <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: tc }} />
            {medic && <span className="label !text-[0.5625rem] absolute left-0 top-1.5 bg-green-600 text-white px-1.5 py-0.5">Medic</span>}
            <span className="tag poster text-sm right-0 bottom-0">{c?.overall}</span>
            </span>
          </span>
          <span className="poster text-xs sm:text-sm block text-center truncate">{c?.name}</span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-[55] bg-[rgb(0_0_0/0.65)] md:hidden" onClick={() => setActive(null)} />
            <div role="dialog" aria-label={c?.name}
              className={`pop-in fixed inset-x-3 bottom-3 z-[60] pb-safe md:absolute md:inset-auto md:w-72 md:z-40 md:pb-0
                ${place.right ? 'md:left-full md:pl-2' : 'md:right-full md:pr-2'} ${place.top ? 'md:top-0' : 'md:bottom-0'}`}>
              <div className="box p-4">
                <div className="flex gap-3">
                  <img src={c?.image_url} alt="" className="w-16 h-20 object-cover object-top border-2 border-[var(--line)] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="poster text-xl">{c?.name}</p>
                    <p className="muted text-xs truncate mt-1">{c?.anime_title}</p>
                    <p className="label type-text !text-[0.6875rem] mt-2 !whitespace-normal">{c?.power_type} · OVR {c?.overall} · {formatGold(c?.gold_cost)}</p>
                    <p className="label muted !text-[0.625rem] mt-1">{def.type} · {def.points} pts / win</p>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 mt-3">
                  {STATS.map(([lab, key]) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <div className="h-10 w-full bg-zinc-800 flex items-end"><div className="w-full" style={{ height: `${c?.[key] ?? 0}%`, background: tc }} /></div>
                      <span className="num text-xs">{c?.[key]}</span>
                      <span className="label muted !text-[0.5625rem] !tracking-[0.06em]">{lab}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button onClick={() => router.push(`/character?id=${slot.character_id}`)} className="btn-spot press text-base py-2.5">Profile</button>
                  <button onClick={() => change(slot, def)} disabled={removing === slot.id} className="btn text-base py-2.5">Change</button>
                  <button onClick={() => { removeCharacter(slot.id); setActive(null) }} className="btn text-base py-2.5">Remove</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // four rows, front to bench; the medic stands between the two supports
  const LINEUP = [
    ['Champions', [['Champion', 0], ['Champion', 1]]],
    ['Specialists', [['Specialist', 0], ['Specialist', 1], ['Specialist', 2]]],
    ['Support', [['Support', 0], ['Medic', 0], ['Support', 1]]],
    ['Bench', [['Sub', 0], ['Sub', 1]]],
  ]

  // not a Panel: a clipped parent would cut off the fighter popover
  const formationView = (
    <div className="box arrive relative flex-1 min-h-0 grid grid-rows-4 gap-1.5 p-2" style={{ '--i': 1 }}>
      <div className="tone absolute inset-0" aria-hidden="true" />
      {LINEUP.map(([label, cells], r) => (
        <div key={label} className={`relative flex justify-center items-stretch gap-2 sm:gap-5 min-h-0 ${label === 'Bench' ? 'border-t-2 border-dashed border-[var(--line)] pt-1.5' : ''}`}>
          <p className="label muted !text-[0.5625rem] absolute left-0 inset-y-0 w-3 flex items-center justify-center rotate-180 [writing-mode:vertical-rl]">{label}</p>
          {cells.map(([type, i], n) => token(SLOT_DEFS.find(d => d.type === type), i, { right: n < cells.length / 2, top: r < 2 }))}
        </div>
      ))}
    </div>
  )

  if (loading) return <PageSkeleton variant="cards" />

  const over = goldRemaining < 0

  return (
    <Screen nav="lineup" fit={view === 'formation' ? 'always' : undefined}>
      <PageHead compact title="My Lineup" aside={
        <div className="flex items-center gap-1.5">
          <p className={`label border-2 px-2 py-2 ${over ? 'bg-[var(--spot)] border-[var(--spot)] text-white' : 'border-[var(--line)]'}`}>
            {over ? `Over by ${formatGold(-goldRemaining)}` : `${formatGold(goldRemaining)} gold`}
          </p>
          <p className="label border-2 border-[var(--line)] px-2 py-2">{slots.length}/10<span className="sr-only"> slots filled</span></p>
          <button aria-pressed={view === 'list'} onClick={() => { setView(view === 'list' ? 'formation' : 'list'); setActive(null) }}
            className="btn text-sm px-3 py-2">List</button>
        </div>
      } />
      {over && <p role="status" className="label !whitespace-normal mb-2" style={{ color: 'var(--spot-text)' }}>Over budget: this lineup won&apos;t score on battle night</p>}

      {view === 'formation' && formationView}
        {view === 'list' && <div className="grid md:grid-cols-2 gap-3 items-start">
          {SLOT_DEFS.map((def, defIndex) => {
            const filled = slots.filter(s => s.slot_type === def.type)
            return (
              <div key={def.type} className="box arrive" style={{ '--i': defIndex + 2 }}>
                <Caption aside={`${def.points} pts / win`}>{def.type} {filled.length}/{def.count}</Caption>
                <ul className="divide-y-2 divide-current/20 px-3 pb-1">
                  {Array.from({ length: def.count }).map((_, i) => {
                    const slot = filled[i]
                    const tc = POWER_HEX[slot?.characters?.power_type] || '#71717a'
                    return (
                      <li key={slot?.id ?? `empty-${i}`} className="hov-row py-3 px-2">
                        {slot ? (
                          <div className="flex items-center gap-3" style={{ '--tc': tc }}>
                            <button onClick={() => router.push(`/character?id=${slot.character_id}`)}
                              className="art press flex-1 min-w-0 flex items-center gap-3 text-left">
                              <span className="relative flex-shrink-0 block border-2 border-[var(--line)]">
                                <span className="block overflow-hidden">
                                  <img src={slot.characters?.image_url} alt="" className="block w-[68px] h-[68px] object-cover object-top" />
                                </span>
                                <span className="tag poster text-sm right-0 bottom-0">{slot.characters?.overall ?? '—'}</span>
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="poster block text-lg truncate">{slot.characters?.name}</span>
                                <span className="block muted text-xs truncate mt-1">{slot.characters?.anime_title}</span>
                                <span className="label type-text block mt-2 !text-[0.6875rem]">{slot.characters?.power_type || '—'}</span>
                              </span>
                            </button>
                            <div className="self-stretch flex flex-col items-end justify-between flex-shrink-0">
                              <p className="poster text-lg">{formatGold(slot.characters?.gold_cost)}</p>
                              <button onClick={() => removeCharacter(slot.id)} disabled={removing === slot.id}
                                className="btn text-sm px-2.5 py-2">
                                {removing === slot.id ? '…' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => router.push(`/characters?slot=${def.type}&position=${firstFreePosition(def)}&lineup=${party?.id}`)}
                            className="toc press w-full flex items-center gap-3 text-left min-h-[72px]">
                            <span className="w-[72px] h-[72px] border-2 border-dashed border-[var(--line)] flex items-center justify-center muted flex-shrink-0">
                              <Icon name="plus" size={26} />
                            </span>
                            <span className="poster text-lg muted">Recruit {def.type}</span>
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>}
    </Screen>
  )
}
