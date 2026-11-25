// Demo mode's copy of the guild and party rules (fights between squads are in squad-rules.js). The real ones are the functions in sql/005_guilds.sql:
// same names, same arguments, same messages. Check this file with: node lib/guild-rules.test.mjs
import { BEATS, GUILD_MAX, PARTY_MAX } from './game.js'

const fail = (message) => { throw new Error(message) }

export function fight(a, b, r) {
  const power = (me, them) => (me.overall || 50) + (BEATS[me.power_type] === them.power_type ? 6 : 0) + r.gauss() * 8
  const pa = power(a, b), pb = power(b, a)
  return Math.abs(pa - pb) < 1.5 ? null : pa > pb ? a.character_id : b.character_id
}

// wars, cups and extra battles are counted per week, Monday to Sunday (UTC)
export const weekOf = (now = new Date()) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

const nextId = (db, table) => (db.seq[table] = (db.seq[table] || 0) + 1)
const membership = (db, userId) => db.guild_members.find(m => m.user_id === userId)

function leaveParty(db, partyId, userId) {
  db.guild_party_members = db.guild_party_members.filter(m => !(m.party_id === partyId && m.user_id === userId))
  const left = db.guild_party_members.filter(m => m.party_id === partyId)
  const party = db.guild_parties.find(p => p.id === partyId)
  if (!left.length) db.guild_parties = db.guild_parties.filter(p => p.id !== partyId)
  else if (party?.captain_id === userId) party.captain_id = left[0].user_id
}

export const RPC = {
  create_guild(db, me, { p_name, p_tag }) {
    const name = String(p_name || '').trim(), tag = String(p_tag || '').trim().toUpperCase()
    if (membership(db, me)) fail('Leave your guild first')
    if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,22}[A-Za-z0-9]$/.test(name) || !/^[A-Z0-9]{2,4}$/.test(tag)) fail('Name: 3 to 24 letters or numbers. Tag: 2 to 4.')
    if (db.guilds.some(g => g.tag === tag || g.name.toLowerCase() === name.toLowerCase())) fail('That name or tag is taken')
    const id = nextId(db, 'guilds')
    db.guilds.push({ id, name, tag, country_code: db.users.find(u => u.id === me).country_code })
    db.guild_members.push({ user_id: me, guild_id: id, role: 'leader' })
    return id
  },
  join_guild(db, me, { p_guild }) {
    const guild = db.guilds.find(g => g.id === p_guild) || fail('That guild no longer exists')
    if (membership(db, me)) fail('Leave your guild first')
    if (guild.country_code !== db.users.find(u => u.id === me).country_code) fail('That guild is in another country')
    if (db.guild_members.filter(m => m.guild_id === p_guild).length >= GUILD_MAX) fail('That guild is full')
    db.guild_members.push({ user_id: me, guild_id: p_guild, role: 'member' })
  },
  leave_guild(db, me) {
    const mine = membership(db, me)
    if (!mine) return
    for (const p of db.guild_parties.filter(p => p.guild_id === mine.guild_id)) leaveParty(db, p.id, me)
    db.guild_members = db.guild_members.filter(m => m !== mine)
    const left = db.guild_members.filter(m => m.guild_id === mine.guild_id) // oldest first
    if (!left.length) db.guilds = db.guilds.filter(g => g.id !== mine.guild_id)
    else if (mine.role === 'leader') left[0].role = 'leader'
  },
  create_party(db, me, { p_name, p_occasion }) {
    const mine = membership(db, me) || fail('Join a guild first')
    const name = String(p_name || '').trim()
    if (name.length < 3 || name.length > 24) fail('Party name: 3 to 24 characters')
    if (db.guild_party_members.some(m => m.user_id === me && m.occasion === p_occasion)) fail(`You are already in a ${p_occasion} party`)
    const id = nextId(db, 'guild_parties')
    db.guild_parties.push({ id, guild_id: mine.guild_id, name, occasion: p_occasion, captain_id: me })
    db.guild_party_members.push({ party_id: id, user_id: me, occasion: p_occasion })
    return id
  },
  join_party(db, me, { p_party }) {
    const party = db.guild_parties.find(p => p.id === p_party) || fail('That party no longer exists')
    if (membership(db, me)?.guild_id !== party.guild_id) fail('That party belongs to another guild')
    if (db.guild_party_members.filter(m => m.party_id === p_party).length >= PARTY_MAX) fail('That party is full')
    if (db.guild_party_members.some(m => m.user_id === me && m.occasion === party.occasion)) fail(`You are already in a ${party.occasion} party`)
    db.guild_party_members.push({ party_id: p_party, user_id: me, occasion: party.occasion })
  },
  leave_party(db, me, { p_party }) { leaveParty(db, p_party, me) },
}

// the two views the database exposes, built from the demo tables
export function leaderboardRows(db) {
  const week = db.gameweeks[db.gameweeks.length - 1]?.gameweek_id
  return db.user_ranks.map(r => {
    const u = db.users.find(u => u.id === r.user_id)
    const m = membership(db, r.user_id)
    const g = db.guilds.find(g => g.id === m?.guild_id)
    const fought = db.duels.filter(d => d.challenger_id === r.user_id)
    return {
      username: u?.username, avatar_character_id: u?.avatar_character_id, current_rank: r.current_rank, season_points: r.season_points, all_time_points: r.all_time_points, is_legend: r.is_legend,
      user_id: r.user_id, country_code: u?.country_code, guild_id: g?.id ?? null, guild_name: g?.name ?? null, guild_tag: g?.tag ?? null, guild_role: m?.role ?? null,
      duel_wins: fought.filter(d => d.winner_id === r.user_id).length,
      duel_losses: fought.filter(d => d.winner_id === d.opponent_id).length,
      cup_wins: (db.cups || []).filter(c => c.champion.members?.includes(r.user_id)).length,
      week_points: db.fantasy_points.filter(p => p.user_id === r.user_id && p.gameweek_id === week).reduce((n, p) => n + p.final_points, 0),
    }
  })
}

export const guildRows = (db) => db.guilds.map(g => {
  const ids = db.guild_members.filter(m => m.guild_id === g.id).map(m => m.user_id)
  return { guild_id: g.id, name: g.name, tag: g.tag, country_code: g.country_code, members: ids.length,
    season_points: db.user_ranks.filter(r => ids.includes(r.user_id)).reduce((n, r) => n + r.season_points, 0) }
})
