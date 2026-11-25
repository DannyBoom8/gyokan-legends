'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import HomeSquad, { fetchSquad } from '../../components/HomeSquad'
import { Screen, Panel, Caption } from '../../components/Manga'
import PageSkeleton from '../../components/Skeleton'
import { Wordmark } from '../../components/Logo'
import AvatarPicker from '../../components/AvatarPicker'
import { fetchAvatars, avatarFor } from '../../lib/avatar'
import { fetchMe, byPoints, record } from '../../lib/social'
import { weekOf } from '../../lib/guild-rules'
import { BUDGET, COUNTRIES, PARTY_MAX, RANKS, formatPoints, nextBattle, nextRank, rankInfo } from '../../lib/game'

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

// where the player stands with guild, battle party, one-on-one fights and nakama
async function fetchSocial() {
  const me = await fetchMe()
  const week = weekOf()
  const [{ data: friends }, { data: fought }, { data: seat }, { data: guilds }, { data: members }] = await Promise.all([
    supabase.from('nakama').select('nakama_id').eq('user_id', me.user_id),
    supabase.from('duels').select('id').eq('challenger_id', me.user_id).eq('week', week),
    supabase.from('guild_party_members').select('party_id').eq('user_id', me.user_id).eq('occasion', 'battle').maybeSingle(),
    me.guild_id ? supabase.from('guild_leaderboard').select('guild_id').eq('country_code', me.country_code).order('season_points', { ascending: false }) : { data: [] },
    me.guild_id ? byPoints().eq('guild_id', me.guild_id) : { data: [] },
  ])
  let party = null
  if (seat) {
    const [{ data: row }, { data: seats }] = await Promise.all([
      supabase.from('guild_parties').select('name').eq('id', seat.party_id).maybeSingle(),
      supabase.from('guild_party_members').select('user_id').eq('party_id', seat.party_id),
    ])
    party = row && { name: row.name, size: seats?.length || 0 }
  }
  return {
    me, party,
    nakama: friends?.length || 0,
    weekFights: fought?.length || 0,
    guildRank: (guilds || []).findIndex(g => g.guild_id === me.guild_id) + 1,
    place: (members || []).findIndex(m => m.user_id === me.user_id) + 1,
    members: members?.length || 0,
  }
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
  const [social, setSocial] = useState(null)
  const [squad, setSquad] = useState(null)
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
      fetchSocial().then(setSocial)
      fetchSquad(uid).then(setSquad)

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
          ? supabase.from('party_slots').select('id, slot_type, slot_position, characters(gold_cost)').eq('party_id', party.id)
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

  if (loading || !social || !squad) return <PageSkeleton variant="dashboard" />

  const rank = rankInfo(rankData?.current_rank)
  const tier = RANKS.indexOf(rank)
  const seasonPoints = formatPoints(rankData?.season_points)
  const isLegend = rankData?.is_legend || false
  const upcoming = nextRank(seasonPoints)
  const progress = upcoming ? Math.max(0, Math.min(100, ((seasonPoints - rank.min) / (upcoming.min - rank.min)) * 100)) : 100
  const partyCount = slots.length
  const spent = slots.reduce((sum, s) => sum + (s.characters?.gold_cost || 0), 0)
  const goldLeft = BUDGET - spent
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

  // derived from real state, nothing invented
  const { me, party, nakama, weekFights, guildRank, place: guildPlace, members } = social
  const inGuild = !!me.guild_id
  const lineupProblem = partyCount < 10 ? `${partyCount}/10` : !hasMedic ? 'No Medic' : goldLeft < 0 ? 'Over budget' : ''
  const picked = squad.line.length > 0
  const missions = [
    { label: 'Train your squad', value: !picked ? 'Not picked' : squad.unspent ? `${squad.unspent} points to spend` : squad.left ? `${squad.left} battles left` : 'Done today', done: picked && squad.fought && !squad.unspent, path: '/squad' },
    { label: 'Ready your lineup', value: lineupProblem || '10/10', done: !lineupProblem, path: '/lineup' },
    { label: 'Join a guild', value: inGuild ? me.guild_tag : 'Not yet', done: inGuild, path: '/guild' },
    { label: 'Join a party', value: party ? party.name : 'Not yet', done: !!party, path: '/guild?tab=parties' },
  ]
  const missionsDone = missions.filter(m => m.done).length

  const standings = [
    { label: 'Your guild', value: inGuild ? me.guild_name : 'None yet', hint: inGuild ? `#${guildRank || '—'} in ${COUNTRIES[me.country_code]} · you are #${guildPlace} of ${members}` : `Join one in ${COUNTRIES[me.country_code] || 'your country'}`, path: '/guild' },
    { label: 'Battle party', value: party ? party.name : inGuild ? 'None yet' : 'Locked', hint: party ? `${party.size}/${PARTY_MAX} · go to war` : inGuild ? 'Team up for guild wars' : 'Needs a guild', path: party ? '/guild?tab=war' : inGuild ? '/guild?tab=parties' : '/guild' },
    { label: 'Fight record', value: record(me), hint: weekFights ? `${weekFights} ranked this week` : 'Challenge someone', path: '/battles' },
    { label: 'Nakama', value: nakama, hint: nakama ? 'Spar or fight them' : 'Add your first', path: '/nakama' },
  ]

  return (
    <Screen nav="dashboard" fit="desktop">

        <div className="arrive flex items-end justify-between gap-4 border-b-4 border-[var(--line)] pb-2 mb-3 lg:mb-2">
          {/* the sidebar already carries the logo from md up */}
          <Wordmark className="w-48 md:hidden" />
          <p className="poster text-5xl lg:text-3xl hidden md:block">Gyokan <span style={{ color: 'var(--spot)' }}>Legends</span></p>
          <p className="label muted whitespace-nowrap">{week ? `Chapter ${week.gameweek_number}` : 'Chapter 0'}</p>
        </div>

        <div className="home-grid grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-2.5">

          {/* cover */}
          <Panel i={1} className="hov lean-a max-lg:-order-2 md:col-span-2 lg:col-span-8" pageClass="grid grid-cols-[minmax(0,1fr)_34%] min-[360px]:grid-cols-[minmax(0,1fr)_42%] lg:grid-cols-[minmax(0,1fr)_34%] lg:grid-rows-[minmax(0,1fr)_auto]">
            <div className="tone absolute -z-10 inset-0" style={{ '--tone-angle': '45deg' }} aria-hidden="true" />
            <div className="@container flex flex-col items-start gap-5 pb-5 lg:gap-2 lg:pb-2 lg:min-h-0">
              <p className="caption label">Welcome back</p>
              <div className="w-full px-4 md:px-6 flex flex-col items-start gap-4 lg:gap-2 lg:my-auto">
                <h1 className="poster text-[clamp(1.75rem,16cqi,3.75rem)] lg:text-[clamp(1.75rem,11cqi,3.25rem)] break-all">{user?.username}</h1>
                <p className="label"><span className="bg-[var(--spot)] text-white px-2.5 py-1 mr-2">{rank.name}</span><span className="muted">Tier {tier + 1} of {RANKS.length}{isLegend ? ' · Legend' : ''}</span></p>
                <p className="label muted">{formatPoints(rankData?.all_time_points)} points all-time</p>
              </div>
            </div>

            <button onClick={() => { setPickError(''); setPicking(true) }} aria-label="Change your profile picture"
              className="art relative min-h-[15rem] lg:min-h-0 overflow-hidden border-l-[3px] border-[var(--line)]">
              {avatar && <img src={avatar.image_url} alt={avatar.name} className="absolute inset-0 w-full h-full object-cover object-top" />}
              <span className="label !whitespace-normal text-left max-w-full absolute left-0 bottom-0 bg-[var(--ink)] text-[var(--paper)] px-3 py-2 !text-[0.625rem]">Change picture</span>
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

          {/* the fantasy league at a glance: always a black panel */}
          <Panel i={3} className="hov lean-a-end lg:col-span-4" pageClass="!bg-[#12100e] text-[#f3efe4] [--line:#f3efe4] flex flex-col">
            <div className="tone absolute -z-10 inset-0" style={{ '--ink': '#f3efe4' }} aria-hidden="true" />
            <div className="pad flex-1 flex flex-col gap-4 p-5 lg:min-h-0 lg:gap-1 lg:py-2 lg:justify-between">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="poster text-4xl lg:text-2xl">Fantasy</h2>
                <p className="label opacity-70 text-right"><span className="sr-only">Next battle </span>{battle.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
              </div>
              <Countdown target={battle.getTime()} />
              <dl className="grid grid-cols-3 divide-x-2 divide-current/25 border-y-2 border-current/25">
                {[['Position', place < 0 ? '—' : `#${place + 1}`], ['Scored', formatPoints(weekPoints)], ['Lineup', lineupProblem || 'Ready']].map(([k, v]) => (
                  <div key={k} className="min-w-0 px-2 py-2 lg:py-1 first:pl-0">
                    <dt className="label !text-[0.625rem] opacity-70 !whitespace-normal">{k}</dt>
                    <dd className="poster text-2xl lg:text-xl mt-1 lg:mt-0.5 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm lg:text-xs font-semibold break-words lg:[@media(max-height:760px)]:hidden">{standing}</p>
              <button onClick={() => router.push('/lineup')} className="btn-spot poster text-2xl lg:text-xl w-full mt-auto py-3.5 lg:py-1.5">Open fantasy</button>
            </div>
          </Panel>

          {/* the main game */}
          <HomeSquad squad={squad} />

          {/* guild, party, fights, nakama */}
          <Panel i={5} className="hov md:order-3 md:col-span-2 lg:order-1 lg:col-span-12">
            <div className="lg:hidden"><Caption>Your guild life</Caption></div>
            <div className="pad p-4 lg:p-2">
              <ul className="grid grid-cols-2 lg:grid-cols-4 gap-[3px] bg-[var(--line)] border-[3px] border-[var(--line)]">
                {standings.map(s => (
                  <li key={s.label} className="min-w-0 flex">
                    <button onClick={() => router.push(s.path)} className="hov-tile w-full min-w-0 bg-[var(--panel)] text-left px-3 py-3 lg:py-1.5">
                      <span className="label muted block !text-[0.625rem]">{s.label}</span>
                      <span className="poster block text-xl lg:text-lg mt-1.5 lg:mt-1 break-words lg:truncate">{s.value}</span>
                      <span className="muted block text-xs mt-1 lg:hidden xl:block xl:truncate">{s.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          {/* missions */}
          <Panel i={4} className="hov lean-b-end md:order-2 lg:order-none lg:col-span-4" pageClass="flex flex-col">
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

          {/* rank ladder: phones and tablets only, desktop gives the row to the guild panel */}
          <Panel i={6} className="hov md:order-5 md:col-span-2 lg:!hidden">
            <Caption>Power levels</Caption>
            <div className="pad p-4">
              <ol aria-label="Power levels" className="grid grid-cols-3 gap-[3px] bg-[var(--line)] border-[3px] border-[var(--line)]">
                {RANKS.map((r, n) => (
                  <li key={r.name} aria-current={n === tier ? 'step' : undefined}
                    className={`hov-card relative isolate px-3 py-3 ${n === tier ? 'bg-[var(--spot)] text-white' : 'bg-[var(--panel)]'}`}>
                    {n > tier && <span className="tone absolute -z-10 inset-0" aria-hidden="true" />}
                    <p className={`label !text-[0.625rem] ${n === tier ? '' : 'muted'}`}>{n === tier ? 'You are here' : n < tier ? 'Cleared' : 'Locked'}</p>
                    <p className="poster text-xl mt-1.5">{r.name}</p>
                    <p className={`label mt-1 !text-[0.6875rem] ${n === tier ? '' : 'muted'}`}>{r.min} pts</p>
                  </li>
                ))}
              </ol>
            </div>
          </Panel>

        </div>

      <AvatarPicker open={picking} list={avatars} current={avatar?.character_id} error={pickError}
        onPick={pickAvatar} onClose={() => setPicking(false)} />
    </Screen>
  )
}
