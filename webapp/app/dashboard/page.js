'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Icon from '../../components/Icon'
import { Screen, Panel, Caption } from '../../components/Manga'
import PageSkeleton from '../../components/Skeleton'
import { Wordmark } from '../../components/Logo'
import AvatarPicker from '../../components/AvatarPicker'
import { fetchAvatars, avatarFor } from '../../lib/avatar'
import { BUDGET, SLOT_DEFS, RANKS, formatGold, formatPoints, nextBattle, nextRank, rankInfo } from '../../lib/game'

// squad strip order: the same front-to-bench order as the party formation
const SQUAD = SLOT_DEFS.flatMap(def => Array.from({ length: def.count }, (_, i) => ({ def, position: i + 1 })))
// full slot names don't fit five-across on a phone
const SHORT = { Champion: 'Champ', Specialist: 'Spec', Support: 'Supp', Medic: 'Medic', Sub: 'Sub' }

// ticks on its own so the rest of the page doesn't re-render every second
function Countdown({ target }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, Math.floor((target - now) / 1000))
  const parts = [['Days', Math.floor(left / 86400)], ['Hrs', Math.floor(left / 3600) % 24], ['Min', Math.floor(left / 60) % 60], ['Sec', left % 60]]
  return (
    <div className="@container"><div className="grid grid-cols-4 divide-x-2 divide-current/25" role="timer" aria-label={parts.slice(0, 3).map(([l, v]) => `${v} ${l}`).join(', ')}>
      {parts.map(([lab, v]) => (
        <div key={lab} aria-hidden="true" className="text-center py-1">
          <p className="poster text-[clamp(1.75rem,16cqi,3rem)]">{String(v).padStart(2, '0')}</p>
          <p className="label !text-[0.625rem] mt-2 opacity-70">{lab}</p>
        </div>
      ))}
    </div></div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [rankData, setRankData] = useState(null)
  const [slots, setSlots] = useState([])
  const [week, setWeek] = useState(null)
  const [weekPoints, setWeekPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState(null)
  const [avatars, setAvatars] = useState([])
  const [picking, setPicking] = useState(false)
  const [pickError, setPickError] = useState('')
  const [board, setBoard] = useState([])
  const router = useRouter()

  const pickAvatar = async (id) => {
    setPickError('')
    const { error } = await supabase.from('users').update({ avatar_character_id: id }).eq('id', uid)
    if (error) return setPickError("Couldn't save your picture. Try again.")
    setUser(u => ({ ...u, avatar_character_id: id }))
    setPicking(false)
  }

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const uid = session.user.id
      setUid(uid)
      fetchAvatars().then(setAvatars)

      const [{ data: userData }, { data: rank }, { data: party }, { data: gw }, { data: standings }] = await Promise.all([
        supabase.from('users').select('username, avatar_character_id').eq('id', uid).single(),
        supabase.from('user_ranks').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('parties').select('id').eq('user_id', uid).maybeSingle(),
        supabase.from('gameweeks').select('gameweek_id, gameweek_number').order('gameweek_id', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('leaderboard').select('username, season_points').order('season_points', { ascending: false }).limit(100),
      ])

      setUser(userData)
      setRankData(rank)
      setWeek(gw)
      setBoard(standings || [])

      const [slotRes, pointsRes] = await Promise.all([
        party
          ? supabase.from('party_slots').select('id, slot_type, slot_position, characters(name, image_url, overall, gold_cost)').eq('party_id', party.id)
          : { data: [] },
        gw
          ? supabase.from('fantasy_points').select('final_points').eq('user_id', uid).eq('gameweek_id', gw.gameweek_id)
          : { data: [] },
      ])
      setSlots(slotRes.data || [])
      setWeekPoints((pointsRes.data || []).reduce((sum, p) => sum + Number(p.final_points || 0), 0))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageSkeleton variant="dashboard" />

  const rank = rankInfo(rankData?.current_rank)
  const tier = RANKS.indexOf(rank)
  const seasonPoints = formatPoints(rankData?.season_points)
  const isLegend = rankData?.is_legend || false
  const upcoming = nextRank(seasonPoints)
  const progress = upcoming ? Math.max(0, Math.min(100, ((seasonPoints - rank.min) / (upcoming.min - rank.min)) * 100)) : 100
  const partyCount = slots.length
  const spent = slots.reduce((sum, s) => sum + (s.characters?.gold_cost || 0), 0)
  const goldLeft = BUDGET - spent
  const power = partyCount ? Math.round(slots.reduce((sum, s) => sum + (s.characters?.overall || 0), 0) / partyCount) : 0
  const avatar = avatarFor(avatars, user?.username, user?.avatar_character_id)
  const battle = nextBattle()
  const hasMedic = slots.some(s => s.slot_type === 'Medic')
  // same order as the Leaderboard page, so both show the same position
  const place = board.findIndex(r => r.username === user?.username)
  const rival = place > 0 ? board[place - 1] : board[place + 1]
  const gap = rival ? formatPoints(Math.abs(rival.season_points - seasonPoints)) : 0
  const standing = place < 0 ? (board.length ? 'Outside the top 100' : 'Leaderboard unavailable')
    : !rival ? 'First on the board'
    : place > 0 ? `${gap} pts behind ${rival.username}`
    : `${gap} pts ahead of ${rival.username}`

  // derived from the real party state, nothing invented
  const missions = [
    { label: 'Fill all 10 slots', value: `${partyCount}/10`, done: partyCount === 10, path: '/party' },
    { label: 'Recruit a Medic', value: hasMedic ? '1/1' : '0/1', done: hasMedic, path: '/party' },
    { label: 'Stay within budget', value: formatGold(goldLeft), done: partyCount > 0 && goldLeft >= 0, path: '/party' },
    { label: 'Score on battle night', value: `${formatPoints(weekPoints)} pts`, done: weekPoints > 0, path: '/battles' },
  ]
  const missionsDone = missions.filter(m => m.done).length

  const links = [
    { label: 'Characters', hint: 'Scout fighters', path: '/characters' },
    { label: 'Leaderboard', hint: 'See who leads', path: '/leaderboard' },
    { label: 'Points', hint: 'Your scoring log', path: '/points' },
    { label: 'How to play', hint: 'Slots, types, ranks', path: '/rules' },
  ]

  return (
    <Screen nav="dashboard" fit="desktop">

        <div className="arrive flex items-end justify-between gap-4 border-b-4 border-[var(--line)] pb-2 mb-3 lg:mb-2">
          {/* the sidebar already carries the logo from md up */}
          <Wordmark className="w-48 md:hidden" />
          <p className="poster text-5xl lg:text-3xl hidden md:block">Gyokan <span style={{ color: 'var(--spot)' }}>Legends</span></p>
          <p className="label muted">{week ? `Chapter ${week.gameweek_number}` : 'Chapter 0'}</p>
        </div>

        <div className="home-grid grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-2.5">

          {/* cover */}
          <Panel i={1} className="hov lean-a md:col-span-2 lg:col-span-8" pageClass="grid grid-cols-[minmax(0,1fr)_42%] lg:grid-cols-[minmax(0,1fr)_34%] lg:grid-rows-[minmax(0,1fr)_auto]">
            <div className="tone absolute -z-10 inset-0" style={{ '--tone-angle': '45deg' }} aria-hidden="true" />
            <div className="@container flex flex-col items-start gap-5 pb-5 lg:gap-2 lg:pb-2 lg:min-h-0">
              <p className="caption label">Welcome back</p>
              <div className="w-full px-4 md:px-6 flex flex-col items-start gap-4 lg:gap-2 lg:my-auto">
                <h1 className="poster text-[clamp(1.75rem,16cqi,3.75rem)] lg:text-[clamp(1.75rem,11cqi,3.25rem)] break-all">{user?.username}</h1>
                <p className="label"><span className="bg-[var(--spot)] text-white px-2.5 py-1 mr-2">{rank.name}</span><span className="muted">Tier {tier + 1} of {RANKS.length}{isLegend ? ' · Legend' : ''}</span></p>
                <button onClick={() => router.push('/leaderboard')} className="toc hov-card block w-full max-w-[18rem] lg:max-w-[30rem] lg:flex text-left bg-[var(--panel)] border-2 border-[var(--line)]">
                  <span className="grid grid-cols-[auto_1fr] divide-x-2 divide-current/25 lg:flex-shrink-0">
                    <span className="block px-3 py-2 lg:py-1">
                      <span className="label muted block !text-[0.625rem]">Position</span>
                      <span className="poster block text-3xl lg:text-2xl mt-1 lg:mt-0.5 whitespace-nowrap">{place < 0 ? '—' : `#${place + 1}`}{place >= 0 && board.length < 100 && <span className="text-sm muted"> of {board.length}</span>}</span>
                    </span>
                    <span className="block px-3 py-2 lg:py-1">
                      <span className="label muted block !text-[0.625rem]">All-time</span>
                      <span className="poster block text-3xl lg:text-2xl mt-1 lg:mt-0.5">{formatPoints(rankData?.all_time_points)}</span>
                    </span>
                  </span>
                  <span className="block border-t-2 lg:flex lg:flex-1 lg:min-w-0 lg:items-center lg:border-t-0 lg:border-l-2 border-current/25 px-3 py-2 lg:py-1 text-sm lg:text-xs font-semibold break-words">{standing}</span>
                </button>
              </div>
            </div>

            <button onClick={() => { setPickError(''); setPicking(true) }} aria-label="Change your profile picture"
              className="art relative min-h-[15rem] lg:min-h-0 overflow-hidden border-l-[3px] border-[var(--line)]">
              {avatar && <img src={avatar.image_url} alt={avatar.name} className="absolute inset-0 w-full h-full object-cover object-top" />}
              <span className="label absolute left-0 bottom-0 bg-[var(--ink)] text-[var(--paper)] px-3 py-2 !text-[0.625rem]">Change picture</span>
            </button>

            <div className="col-span-2 border-t-[3px] border-[var(--line)] px-4 md:px-6 py-4 lg:py-2 lg:pr-[calc(var(--s)+16px)]">
              <div className="flex items-end justify-between gap-3 mb-2">
                <p className="poster text-4xl md:text-5xl lg:text-3xl">{seasonPoints} <span className="text-lg muted">season pts</span></p>
                <p className="label muted text-right">{upcoming ? `${formatPoints(upcoming.min - seasonPoints)} to ${upcoming.name}` : 'Top rank reached'}</p>
              </div>
              <div className="h-3 bg-[color-mix(in_oklab,var(--ink)_15%,transparent)]" role="progressbar" aria-label="Progress to next rank" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-[var(--spot)]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </Panel>

          {/* next battle: always a black panel */}
          <Panel i={2} className="hov lg:col-span-4" pageClass="!bg-[#12100e] text-[#f3efe4] [--line:#f3efe4] flex flex-col">
            <div className="tone absolute -z-10 inset-0" style={{ '--ink': '#f3efe4' }} aria-hidden="true" />
            <div className="pad flex-1 flex flex-col gap-5 p-5 lg:min-h-0 lg:gap-1.5 lg:py-3 lg:justify-between">
              <h2 className="poster text-4xl lg:text-3xl">Next battle</h2>
              <Countdown target={battle.getTime()} />
              <p className="text-sm">{battle.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
              <div className="flex items-baseline justify-between">
                <span className="label opacity-70">Last battle</span>
                <span className="poster text-3xl">{formatPoints(weekPoints)} <span className="text-base">pts</span></span>
              </div>
              <button onClick={() => router.push('/battles')} className="btn-spot poster text-2xl w-full mt-auto py-3.5 lg:py-2.5">To battle</button>
            </div>
          </Panel>

          {/* crew */}
          <Panel i={3} className="hov lean-b md:order-4 md:col-span-2 lg:order-none lg:col-span-8" pageClass="flex flex-col">
            <Caption aside={<span className="lg:mr-8">{partyCount} / 10<span className="hidden lg:inline"> · Power {power || '—'} · {formatGold(goldLeft)} left</span></span>}>Your crew</Caption>
            <div className="pad p-4 lg:flex-1 lg:min-h-0 lg:py-2.5">
              <ul className="grid grid-cols-5 gap-x-2 gap-y-3 lg:h-full lg:grid-rows-2 lg:gap-y-2">
                {SQUAD.map(({ def, position }) => {
                  const c = slots.find(s => s.slot_type === def.type && s.slot_position === position)?.characters
                  return (
                    <li key={`${def.type}-${position}`} className="min-w-0 lg:min-h-[4.5rem]">
                      <button onClick={() => router.push('/party')} aria-label={c ? `${c.name}, ${def.type}, rated ${c.overall}` : `Empty ${def.type} slot`}
                        className="hov-thumb w-full block text-left lg:h-full">
                        <span className="art relative block overflow-hidden border-2 border-[var(--line)] lg:h-full">
                          {c
                            ? <img src={c.image_url} alt="" className="block w-full aspect-[3/4] object-cover object-top lg:absolute lg:inset-0 lg:aspect-auto lg:h-full" />
                            : <span className="w-full aspect-[3/4] lg:aspect-auto lg:h-full flex items-center justify-center muted"><Icon name="plus" size={24} /></span>}
                          {c && <span className="poster absolute left-0 bottom-0 bg-[var(--ink)] text-[var(--paper)] text-base px-1.5 py-0.5">{c.overall}</span>}
                        </span>
                        <span aria-hidden="true" className="label !text-[0.625rem] !tracking-[0.06em] block truncate mt-1.5 sm:hidden">{SHORT[def.type]}</span>
                        <span aria-hidden="true" className="label !text-[0.625rem] !tracking-[0.06em] mt-1.5 hidden sm:block lg:hidden">{def.type}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <dl className="grid grid-cols-3 divide-x-2 divide-current/25 mt-4 pt-3 border-t-2 border-current/25 lg:hidden">
                {[['Crew power', power || '—'], ['Gold spent', formatGold(spent)], ['Gold left', formatGold(goldLeft)]].map(([lab, val]) => (
                  <div key={lab} className="px-3 first:pl-0">
                    <dt className="label muted !text-[0.625rem]">{lab}</dt>
                    <dd className="poster text-3xl mt-1.5" style={lab === 'Gold left' && goldLeft < 0 ? { color: 'var(--spot-text)' } : undefined}>{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Panel>

          {/* missions */}
          <Panel i={4} className="hov md:order-3 lg:order-none lg:col-span-4" pageClass="flex flex-col">
            <div className="tone absolute -z-10 inset-0" aria-hidden="true" />
            <div className="lg:pl-1.5"><Caption aside={`${missionsDone} / ${missions.length}`}>Missions</Caption></div>
            <div className="pad p-4 lg:flex-1 lg:min-h-0 lg:py-1">
              <ul className="divide-y-2 divide-current/20 lg:h-full lg:flex lg:flex-col">
                {missions.map(m => (
                  <li key={m.label} className="lg:flex-1 lg:min-h-0 lg:flex">
                    <button onClick={() => router.push(m.path)} className="toc hov-row w-full flex items-center gap-3 px-3 py-3.5 lg:py-0.5 text-left">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[0.9375rem] lg:text-sm lg:leading-tight font-semibold">{m.label}<span className="sr-only">{m.done ? ', done' : ', not done'}</span></span>
                        <span className="label muted lg:!text-[0.625rem]">{m.value}</span>
                      </span>
                      <span className={`w-7 h-7 flex items-center justify-center flex-shrink-0 ${m.done ? 'bg-[var(--spot)] text-white' : 'border-2 border-current/40'}`} aria-hidden="true">
                        {m.done && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {missionsDone === missions.length && <p className="poster text-2xl text-center mt-3 lg:hidden" style={{ color: 'var(--spot-text)' }}>All clear</p>}
            </div>
          </Panel>

          {/* rank ladder: one strip of small panels */}
          <Panel i={5} className="hov md:order-5 md:col-span-2 lg:order-none lg:col-span-12">
            <div className="lg:hidden"><Caption>Power levels</Caption></div>
            <div className="pad p-4 lg:p-2">
              <ol aria-label="Power levels" className="grid grid-cols-3 lg:grid-cols-6 gap-[3px] bg-[var(--line)] border-[3px] border-[var(--line)]">
                {RANKS.map((r, n) => (
                  <li key={r.name} aria-current={n === tier ? 'step' : undefined}
                    className={`hov-card relative isolate px-3 py-3 lg:py-1.5 lg:flex lg:flex-col xl:flex-row xl:items-baseline xl:justify-between xl:gap-2 ${n === tier ? 'bg-[var(--spot)] text-white' : 'bg-[var(--panel)]'}`}>
                    {n > tier && <span className="tone absolute -z-10 inset-0" aria-hidden="true" />}
                    <p className={`label !text-[0.625rem] lg:sr-only ${n === tier ? '' : 'muted'}`}>{n === tier ? 'You are here' : n < tier ? 'Cleared' : 'Locked'}</p>
                    <p className="poster text-xl mt-1.5 lg:mt-0 lg:text-lg">{r.name}</p>
                    <p className={`label mt-1 lg:mt-0 !text-[0.6875rem] ${n === tier ? '' : 'muted'}`}>{r.min} pts</p>
                  </li>
                ))}
              </ol>
            </div>
          </Panel>

          {/* contents */}
          <Panel i={6} className="md:order-6 md:col-span-2 lg:!hidden">
            <nav aria-label="More" className="h-full grid grid-cols-2 gap-[3px] bg-[var(--line)]">
              {links.map(l => (
                <button key={l.path} onClick={() => router.push(l.path)} className="hov-tile bg-[var(--panel)] text-left p-4 flex flex-col justify-end gap-1 min-h-[6.5rem] lg:first:pl-10 lg:[&:nth-child(3)]:pl-6">
                  <span className="poster text-xl">{l.label}</span>
                  <span className="muted text-sm">{l.hint}</span>
                </button>
              ))}
            </nav>
          </Panel>
        </div>

      <AvatarPicker open={picking} list={avatars} current={avatar?.character_id} error={pickError}
        onPick={pickAvatar} onClose={() => setPicking(false)} />
    </Screen>
  )
}
