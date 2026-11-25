// Demo mode's copy of the guild, party and fight rules. The real ones are the functions in sql/005_guilds.sql:
// same names, same arguments, same messages. Check this file with: node lib/guild-rules.test.mjs
import { BEATS, BUDGET, SLOT_DEFS, DRAW_POINTS, GUILD_MAX, PARTY_MAX } from './game.js'

const fail = (message) => { throw new Error(message) }

export function fight(a, b, r) {
  const power = (me, them) => (me.overall || 50) + (BEATS[me.power_type] === them.power_type ? 6 : 0) + r.gauss() * 8
  const pa = power(a, b), pb = power(b, a)
  return Math.abs(pa - pb) < 1.5 ? null : pa > pb ? a.character_id : b.character_id
}

const random = () => Math.random()
random.gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random())

// ranked fights are limited per week, Monday to Sunday (UTC)
export const weekOf = (now = new Date()) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

const nextId = (db, table) => (db.seq[table] = (db.seq[table] || 0) + 1)
const membership = (db, userId) => db.guild_members.find(m => m.user_id === userId)

function lineup(db, userId) {
  const party = db.parties.find(p => p.user_id === userId)
  return db.party_slots.filter(s => s.party_id === party?.id)
    .map(s => ({ ...s, character: db.characters.find(c => c.character_id === s.character_id) }))
    .filter(s => s.character)
}

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

  // lineup against lineup, slot by slot; a spar (p_ranked false) is never stored
  duel(db, me, { p_opponent, p_ranked }, r = random, week = weekOf()) {
    if (p_opponent === me) fail("You can't fight yourself")
    if (!db.users.some(u => u.id === p_opponent)) fail('No such player')
    const [a, b] = [me, p_opponent].map(id => {
      const slots = lineup(db, id)
      if (!slots.length) fail(id === me ? 'Build your lineup first' : 'They have no lineup yet')
      if (slots.reduce((n, s) => n + s.character.gold_cost, 0) > BUDGET) fail(id === me ? 'Your lineup is over budget' : 'Their lineup is over budget')
      return slots
    })
    let mine = 0, theirs = 0
    const rounds = []
    for (const def of SLOT_DEFS) for (let position = 1; position <= def.count; position++) {
      const find = (list) => list.find(s => s.slot_type === def.type && s.slot_position === position)?.character
      const x = find(a), y = find(b)
      if (!x && !y) continue
      const win = !y ? x.character_id : !x ? y.character_id : fight(x, y, r)
      const winner = win == null ? 'draw' : x && win === x.character_id ? 'a' : 'b'
      mine += winner === 'a' ? def.points : winner === 'draw' ? DRAW_POINTS : 0
      theirs += winner === 'b' ? def.points : winner === 'draw' ? DRAW_POINTS : 0
      rounds.push({ slot: def.type, position, a: x?.character_id ?? null, b: y?.character_id ?? null, winner })
    }
    const winner_id = mine > theirs ? me : theirs > mine ? p_opponent : null
    const result = { ranked: !!p_ranked, challenger_score: mine, opponent_score: theirs, winner_id, rounds }
    if (p_ranked) {
      if (db.duels.some(d => d.challenger_id === me && d.opponent_id === p_opponent && d.week === week)) fail('You already fought them this week. Spar instead.')
      db.duels.push({ ...result, id: nextId(db, 'duels'), challenger_id: me, opponent_id: p_opponent, week, created_at: new Date().toISOString() })
    }
    return result
  },
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
      duel_draws: fought.filter(d => d.winner_id == null).length,
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
