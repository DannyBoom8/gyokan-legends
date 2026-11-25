'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { COUNTRIES, formatPoints, rankInfo } from '../lib/game'
import { record, squadFight } from '../lib/social'
import { DAILY_FIGHTS } from '../lib/squad'
import { avatarFor } from '../lib/avatar'
import Icon from './Icon'
import { Panel } from './Manga'
import Arena from './Arena'

export const Empty = ({ children }) => <p className="box muted text-sm px-5 py-10 text-center">{children}</p>

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 mb-3">
      {tabs.map(([id, text]) => (
        <button key={id} onClick={() => onChange(id)} aria-pressed={value === id} className="btn bg-[var(--panel)] flex-1 sm:flex-none whitespace-nowrap text-lg px-2 sm:px-5 py-2.5">{text}</button>
      ))}
    </div>
  )
}

export const Portrait = ({ player, avatars, className = 'w-11 h-[52px]' }) => (
  <span className="block overflow-hidden border-2 border-[var(--line)] flex-shrink-0">
    <img src={avatarFor(avatars, player.username, player.avatar_character_id)?.image_url} alt="" loading="lazy" className={`block object-cover object-top ${className}`} />
  </span>
)

const place = (i) => `poster text-2xl w-11 h-11 flex items-center justify-center flex-shrink-0 ${i < 3 ? 'bg-[var(--spot)] text-white' : 'muted'}`

// earned by winning a cup; the number shows from the second win
export const ChampionBadge = ({ wins, children }) => wins > 0 && (
  <span className="label flex-shrink-0 inline-flex items-center gap-1 bg-[var(--spot)] text-white px-1.5 py-1">
    <Icon name="trophy" size={14} />
    {children}{wins > 1 && <span aria-hidden="true">×{wins}</span>}
    <span className="sr-only"> Cup champion, {wins} {wins === 1 ? 'win' : 'wins'}</span>
  </span>
)

// a ranked list of players; tapping one opens their card
export function PlayerList({ rows, me, avatars, onOpen, showGuild = true }) {
  return (
    <Panel i={1}>
      <ol className="divide-y-[3px] divide-[var(--line)]">
        {rows.map((r, i) => {
          const rank = rankInfo(r.current_rank)
          const isMe = r.user_id === me
          return (
            <li key={r.user_id} aria-current={isMe ? 'true' : undefined}>
              <button onClick={() => onOpen(r)}
                className={`hov-row art w-full flex items-center gap-3 p-3 text-left ${isMe ? 'bg-[color-mix(in_oklab,var(--spot)_20%,var(--panel))]' : ''}`}>
                <span className={place(i)}>{i + 1}</span>
                <Portrait player={r} avatars={avatars} />
                <span className="flex-1 min-w-0">
                  <span className="poster block text-xl truncate">
                    {r.username}
                    {r.is_legend && <><Icon name="crown" size={16} className="inline ml-1.5 -mt-1" /><span className="sr-only"> Legend</span></>}
                  </span>
                  <span className="flex items-center gap-2 min-w-0 mt-1.5">
                  <ChampionBadge wins={r.cup_wins} />
                  <span className="label block truncate !tracking-[0.08em]">
                    <span className={rank.color}>{rank.name}</span>
                    {showGuild && r.guild_tag && <span className="muted"> · {r.guild_tag}</span>}
                    {!showGuild && r.guild_role === 'leader' && <span className="muted"> · Leader</span>}
                    <span className="muted hidden sm:inline"> · {record(r)}</span>
                    {isMe && <span> · you</span>}
                  </span>
                  </span>
                </span>
                <span className="poster text-3xl">{formatPoints(r.season_points)}<span className="sr-only"> season points</span></span>
              </button>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

export function GuildList({ rows, mine, action }) {
  return (
    <Panel i={2}>
      <ol className="divide-y-[3px] divide-[var(--line)]">
        {rows.map((g, i) => (
          <li key={g.guild_id} aria-current={g.guild_id === mine ? 'true' : undefined}
            className={`hov-row flex items-center gap-3 p-3 ${g.guild_id === mine ? 'bg-[color-mix(in_oklab,var(--spot)_20%,var(--panel))]' : ''}`}>
            <span className={place(i)}>{i + 1}</span>
            <span className="poster text-lg w-14 h-[52px] hidden sm:flex items-center justify-center flex-shrink-0 border-2 border-[var(--line)]">{g.tag}</span>
            <div className="flex-1 min-w-0">
              <p className="poster text-xl break-words">{g.name}</p>
              <p className="label muted !whitespace-normal mt-1.5"><span className="sm:hidden">{g.tag} · </span>{g.members} {g.members === 1 ? 'member' : 'members'}{g.guild_id === mine && <span className="sr-only"> · yours</span>}</p>
            </div>
            <p className="poster text-2xl sm:text-3xl">{formatPoints(g.season_points)}<span className="sr-only"> points</span></p>
            {action?.(g)}
          </li>
        ))}
      </ol>
    </Panel>
  )
}

// one player's card: spar, fight, nakama. Mount it with key={player.user_id}.
export function PlayerSheet({ player, me, avatars, onClose, onChange }) {
  const ref = useRef(null)
  const [nakama, setNakama] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [battle, setBattle] = useState(null)
  const router = useRouter()
  const self = player.user_id === me

  useEffect(() => {
    if (!ref.current.open) ref.current.showModal()
    if (!self) supabase.from('nakama').select('nakama_id').eq('user_id', me).eq('nakama_id', player.user_id).maybeSingle()
      .then(({ data }) => setNakama(!!data))
  }, [])

  const toggleNakama = async () => {
    setBusy(true); setError('')
    const { error } = nakama
      ? await supabase.from('nakama').delete().eq('user_id', me).eq('nakama_id', player.user_id)
      : await supabase.from('nakama').insert({ user_id: me, nakama_id: player.user_id })
    setBusy(false)
    if (error) return setError("Couldn't update your nakama. Try again.")
    setNakama(!nakama)
    onChange?.()
  }

  const fight = async (ranked) => {
    setBusy(true); setError('')
    const { battle, error } = await squadFight(player, ranked)
    setBusy(false)
    if (error) return setError(error)
    setBattle(battle)
    if (ranked) onChange?.()
  }

  return (
    <>
    <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()} aria-label={player.username} className="picker">
      <div className="flex items-center gap-3 p-4 border-b-[3px] border-current">
        <Portrait player={player} avatars={avatars} className="w-16 h-20" />
        <div className="flex-1 min-w-0">
          <h2 className="poster text-xl min-[360px]:text-2xl sm:text-3xl break-words">{player.username}</h2>
          <p className="label muted !whitespace-normal mt-1.5">{player.guild_name ? `${player.guild_tag} · ${player.guild_name}` : 'No guild'} · {COUNTRIES[player.country_code] || player.country_code}</p>
          <p className={`label mt-1 ${rankInfo(player.current_rank).color}`}>{player.current_rank}</p>
          {player.cup_wins > 0 && <p className="mt-2"><ChampionBadge wins={player.cup_wins}><span aria-hidden="true">Cup champion </span></ChampionBadge></p>}
        </div>
        <button onClick={onClose} className="label self-start border-2 border-current px-3 py-2">Close</button>
      </div>

      <div className="overflow-y-auto">
        <dl className="grid grid-cols-3 divide-x-2 divide-current/25 p-4">
          {[['Season', formatPoints(player.season_points)], ['All-time', formatPoints(player.all_time_points)], ['Battle record', record(player)]].map(([k, v]) => (
            <div key={k} className="min-w-0 px-2 min-[360px]:px-3 first:pl-0">
              <dt className="label muted !text-[0.625rem] !whitespace-normal">{k}</dt>
              <dd className="poster text-lg sm:text-2xl whitespace-nowrap mt-1.5">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {!self && (
        <div className="p-4 border-t-[3px] border-current">
          {error && <p role="alert" className="text-sm font-semibold mb-2" style={{ color: 'var(--spot-text)' }}>{error}</p>}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => fight(false)} disabled={busy} className="btn text-lg py-3">Spar</button>
            <button onClick={() => fight(true)} disabled={busy} className="btn-spot text-lg py-3">Fight</button>
            <button onClick={toggleNakama} disabled={busy || nakama == null} aria-pressed={!!nakama} className="btn text-lg py-3">{nakama ? 'Nakama ✓' : '+ Nakama'}</button>
          </div>
          <p className="muted text-xs mt-2">Your squads fight. Spar is practice with squads evened and no traits. Fight is ranked, {DAILY_FIGHTS} a day: it goes on your record and a win can earn an upgrade point and season points.</p>
        </div>
      )}
    </dialog>
    {battle && <Arena {...battle} onClose={() => setBattle(null)} onSpend={() => router.push('/squad')} />}
    </>
  )
}
