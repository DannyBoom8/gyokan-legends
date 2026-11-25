// Checks the guild and party rules: node lib/guild-rules.test.mjs
import assert from 'node:assert/strict'
import { RPC, leaderboardRows, guildRows, weekOf } from './guild-rules.js'

const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
const db = {
  seq: {}, guilds: [], guild_members: [], guild_parties: [], guild_party_members: [], duels: [], gameweeks: [], fantasy_points: [],
  users: players.map(id => ({ id, username: id, country_code: 'NG' })),
  user_ranks: players.map((id, i) => ({ user_id: id, season_points: i, all_time_points: i })),
}
const call = (name, who, args = {}) => RPC[name](db, who, args)
const refused = (fn, text) => assert.throws(fn, { message: new RegExp(text) })

// guilds: one per player, unique name and tag, leadership passes on, empty guilds go
const g = call('create_guild', 'a', { p_name: 'Lagos Shinobi', p_tag: 'lsn' })
refused(() => call('create_guild', 'a', { p_name: 'Second', p_tag: 'SEC' }), 'Leave your guild')
refused(() => call('create_guild', 'b', { p_name: 'lagos shinobi', p_tag: 'XX' }), 'taken')
refused(() => call('create_guild', 'b', { p_name: '<b>', p_tag: 'XX' }), 'Name')
for (const who of ['b', 'c', 'd', 'e', 'f']) call('join_guild', who, { p_guild: g })
db.users[6].country_code = 'GH'
refused(() => call('join_guild', 'g', { p_guild: g }), 'another country')
db.users[6].country_code = 'NG'

// parties: guild mates only, one per occasion, five seats
const p = call('create_party', 'a', { p_name: 'Raiders', p_occasion: 'battle' })
refused(() => call('join_party', 'g', { p_party: p }), 'another guild')
refused(() => call('create_party', 'g', { p_name: 'Loners', p_occasion: 'battle' }), 'Join a guild')
refused(() => call('create_party', 'a', { p_name: 'Again', p_occasion: 'battle' }), 'already in a battle')
call('create_party', 'a', { p_name: 'Cup team', p_occasion: 'tournament' })
for (const who of ['b', 'c', 'd', 'e']) call('join_party', who, { p_party: p })
refused(() => call('join_party', 'f', { p_party: p }), 'full')

// leaving the guild leaves its parties and hands on captain and leader
call('leave_guild', 'a')
assert.equal(db.guild_parties.length, 1)
assert.equal(db.guild_parties[0].captain_id, 'b')
assert.equal(db.guild_members.find(m => m.user_id === 'b').role, 'leader')

// the week wars and cups are counted in starts on Monday
assert.equal(weekOf(new Date('2026-11-29T23:00:00Z')), '2026-11-23')

// guild score is the members' season points; the last one out closes the guild
assert.equal(guildRows(db)[0].season_points, 1 + 2 + 3 + 4 + 5)
for (const who of ['b', 'c', 'd', 'e', 'f']) call('leave_guild', who)
assert.deepEqual([db.guilds.length, db.guild_parties.length, db.guild_party_members.length], [0, 0, 0])

console.log('all guild checks passed')
