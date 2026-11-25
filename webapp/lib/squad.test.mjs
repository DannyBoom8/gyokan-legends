// node lib/squad.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { STATS } from './game.js'
import { CUP_LIMITS, DAILY_FIGHTS, EXTRA_PER_WEEK, PRICES, START_TOTAL, TACTICS, bracket, capped, creditsOf, evened, gainXp, maxHp, newFighter, seeded, simulate, startingStats, statCap, xpFor, xpToNext } from './squad.js'
import { SQUAD_RPC, seedSquads } from './squad-rules.js'
import { leaderboardRows } from './guild-rules.js'

const chars = JSON.parse(readFileSync(new URL('../public/demo/characters.json', import.meta.url), 'utf8'))
const total = (s) => STATS.reduce((n, k) => n + s[k], 0)

// every new fighter is equal in size, whatever the character
for (const c of [...chars, { character_id: 0 }]) {
  const s = startingStats(c)
  assert.equal(total(s), START_TOTAL, c.name)
  assert.ok(STATS.every(k => s[k] >= 25 && s[k] <= 70), c.name)
}

// levels: XP carries over, each level gives three points
const f = newFighter(chars[0])
assert.equal(gainXp(f, xpToNext(1) + xpToNext(2) + 5), 2)
assert.deepEqual([f.level, f.xp, f.points], [3, 5, 6])
assert.ok(xpFor(true, 1, 4, 0) > xpFor(true, 1, 1, 0) && xpFor(true, 1, 1, 1) < xpFor(true, 1, 1, 0) && xpFor(false, 9, 1, 3) >= 1)
assert.ok(Math.abs(total(evened({ ...f.stats, strength: 120 })) - START_TOTAL) <= 4)

// rules
const db = { characters: chars, squads: [], fighters: [] }
seedSquads(db, ['bot-1', 'bot-2'])
const ids = chars.slice(0, 4).map(c => c.character_id)
const throws = (fn, words) => assert.throws(fn, new RegExp(words))
throws(() => SQUAD_RPC.squad_create(db, 'me', { p_characters: [ids[0], ids[0], ids[1]] }), 'different')
throws(() => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }), 'first')
SQUAD_RPC.squad_create(db, 'me', { p_characters: ids.slice(0, 3) })
throws(() => SQUAD_RPC.squad_allocate(db, 'me', { p_character: ids[0], p_stat: 'speed' }), 'No points')
const mine = () => db.fighters.find(x => x.user_id === 'me' && x.character_id === ids[0])
mine().points = 99; mine().stats.speed = statCap(1)
throws(() => SQUAD_RPC.squad_allocate(db, 'me', { p_character: ids[0], p_stat: 'speed' }), 'limit')

const spar = SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-2', p_ranked: false }, 5, '2026-01-01')
assert.equal(spar.xp, 0)
assert.equal(spar.fightsLeft, DAILY_FIGHTS)
const gained = []
for (let i = 0; i < DAILY_FIGHTS; i++) gained.push(SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }, 100 + i, '2026-01-01').xp)
assert.ok(gained.every(x => x > 0) && mine().level >= 2)
throws(() => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }, 1, '2026-01-01'), 'No XP battles')
assert.equal(SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }, 1, '2026-01-02').fightsLeft, DAILY_FIGHTS - 1)

// swapping keeps the benched fighter's progress
const level = mine().level
SQUAD_RPC.squad_swap(db, 'me', { p_slot: 1, p_character: ids[3] })
assert.equal(mine().slot, null)
SQUAD_RPC.squad_swap(db, 'me', { p_slot: 1, p_character: ids[0] })
assert.deepEqual([mine().slot, mine().level], [1, level])
SQUAD_RPC.squad_move_up(db, 'me', { p_slot: 2 })
assert.equal(mine().slot, 2)

// credits: earned by the lineup, spent on a few extra battles or on taking points back
const bank = { user_id: 'me', all_time_points: 0 }
db.user_ranks = [bank]
const squad = db.squads.find(s => s.user_id === 'me')
const buy = () => SQUAD_RPC.squad_buy_battle(db, 'me', {}, '2026-02-02', '2026-02-02')
const battle = (day) => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }, 1, day)
throws(buy, 'Not enough')
bank.all_time_points = 100.5
assert.equal(creditsOf(bank.all_time_points, squad), 100)
for (let i = 0; i < EXTRA_PER_WEEK; i++) buy()
throws(buy, 'a week')
for (let i = 0; i < DAILY_FIGHTS + EXTRA_PER_WEEK; i++) battle('2026-02-02')
throws(() => battle('2026-02-02'), 'No XP battles')
assert.equal(battle('2026-02-03').fightsLeft, DAILY_FIGHTS - 1) // bought battles don't carry over
const earned = (mine().level - 1) * 3
mine().stats = { ...startingStats(chars[0]), speed: startingStats(chars[0]).speed + 2 }
mine().points = earned - 2
SQUAD_RPC.squad_reset(db, 'me', { p_character: ids[0] })
assert.deepEqual([mine().points, mine().stats], [earned, startingStats(chars[0])])
assert.equal(creditsOf(bank.all_time_points, squad), 100 - PRICES.extra * EXTRA_PER_WEEK - PRICES.reset)
throws(() => SQUAD_RPC.squad_reset(db, 'me', { p_character: ids[0] }), 'No placed points')

// guild war: strongest pair off, an unmatched squad takes its bout, once a week
Object.assign(db, {
  wars: [],
  guild_parties: [{ id: 1, guild_id: 1, occasion: 'battle' }, { id: 2, guild_id: 2, occasion: 'battle' }],
  guild_party_members: [['me', 1], ['bot-1', 2], ['bot-2', 2]].map(([user_id, party_id]) => ({ user_id, party_id, occasion: 'battle' })),
})
throws(() => SQUAD_RPC.guild_war(db, 'me', { p_party: 1 }, 1, 'w1'), 'your guild')
const war = SQUAD_RPC.guild_war(db, 'me', { p_party: 2 }, 1, 'w1')
assert.equal(war.bouts.length, 2)
assert.deepEqual([war.bouts[1].a, war.bouts[1].winner, war.bouts[1].battle], [null, 'b', null])
assert.equal(war.score + war.against, 2)
assert.ok(war.bouts[0].battle.events.length)
throws(() => SQUAD_RPC.guild_war(db, 'me', { p_party: 2 }, 1, 'w1'), 'already fought')
throws(() => SQUAD_RPC.guild_war(db, 'bot-1', { p_party: 1 }, 1, 'w1'), 'already fought')
SQUAD_RPC.guild_war(db, 'me', { p_party: 2 }, 1, 'w2')

// cup: stronger fighters come down to the limit, weaker ones are untouched
const veteran = { level: 12, stats: Object.fromEntries(STATS.map(s => [s, 50 + 5])) }
assert.equal(capped(veteran, 3).level, 3)
assert.ok(Math.abs(total(capped(veteran, 3).stats) - (START_TOTAL + 6)) <= 4)
assert.equal(capped(veteran, 12), veteran)
assert.deepEqual(capped({ level: 9, stats: startingStats(chars[0]) }, 3).stats, startingStats(chars[0])) // unplaced points add nothing
assert.deepEqual(bracket(4), [0, 3, 1, 2])
assert.deepEqual(bracket(3), [0, 3, 1, 2])
assert.equal(bracket(5).length, 8)

// knockout: three parties give the best one a bye; one cup a week, and the limit moves on
seedSquads(db, ['bot-3', 'bot-4'])
const members = [['me', 11], ['bot-1', 12], ['bot-2', 13], ['bot-3', 13]]
Object.assign(db, {
  cups: [], guilds: [{ id: 1, tag: 'AAA' }, { id: 2, tag: 'BBB' }],
  guild_parties: [11, 12, 13].map(id => ({ id, name: `P${id}`, guild_id: id === 11 ? 1 : 2, occasion: 'tournament' })),
  guild_party_members: members.map(([user_id, party_id]) => ({ user_id, party_id, occasion: 'tournament' })),
})
throws(() => SQUAD_RPC.cup_play(db, 'bot-4', {}, 1, 'w1'), 'tournament party')
const cup = SQUAD_RPC.cup_play(db, 'me', {}, 1, 'w1')
assert.deepEqual([cup.limit, cup.entrants, cup.rounds.map(r => r.length)], [CUP_LIMITS[0], 3, [1, 1]])
const final = cup.rounds.at(-1)[0]
assert.equal(cup.champion.party_id, final[final.winner].party_id)
assert.ok(cup.rounds.flat().every(m => m.bouts.every(b => !b.battle || [...b.battle.a.fighters, ...b.battle.b.fighters].every(f => f.level <= cup.limit))))
throws(() => SQUAD_RPC.cup_play(db, 'me', {}, 1, 'w1'), 'been played')
// the badge goes to the winners who had a squad, and to nobody else
const winners = members.filter(([id, party]) => party === cup.champion.party_id && db.squads.some(s => s.user_id === id)).map(([id]) => id)
assert.deepEqual([...cup.champion.members].sort(), winners.sort())
const badges = leaderboardRows({ ...db, users: [], user_ranks: members.map(([user_id]) => ({ user_id })), guild_members: [], duels: [], gameweeks: [], fantasy_points: [] })
assert.deepEqual(badges.filter(r => r.cup_wins === 1).map(r => r.user_id).sort(), winners)
SQUAD_RPC.cup_next(db, 'me', {}, 'w1')
assert.equal(SQUAD_RPC.cup_play(db, 'me', {}, 2, 'w1').limit, CUP_LIMITS[1])

// engine: same seed, same fight; the log ends with a knockout and HP stays in range
const team = (cs, tactic = 'attack', tweak = s => s) => ({ tactic, fighters: cs.map(c => ({ power_type: c.power_type, stats: tweak({ ...startingStats(c) }) })) })
const one = simulate(team(chars.slice(0, 3)), team(chars.slice(3, 6), 'guard'), 9)
assert.deepEqual(one, simulate(team(chars.slice(0, 3)), team(chars.slice(3, 6), 'guard'), 9))
assert.equal(one.events.at(-1).kind, 'ko')
assert.ok(one.events.every(e => e.hp.a >= 0 && e.hp.b >= 0 && e.meter.a <= 100 && e.meter.b <= 100))
assert.ok(maxHp(startingStats(chars[0])) > 0)

// balance, over thousands of fights between random characters
function rate(tweakA, tweakB, tacticA = 'attack', tacticB = 'attack') {
  const r = seeded(3), pick = () => chars[Math.floor(r() * chars.length)], N = 4000
  let wins = 0
  for (let i = 0; i < N; i++) {
    const A = team([pick(), pick(), pick()], tacticA, tweakA), B = team([pick(), pick(), pick()], tacticB, tweakB), flip = i % 2
    const out = flip ? simulate(B, A, i + 1) : simulate(A, B, i + 1)
    if ((out.winner === 'a') !== !!flip) wins++
  }
  return wins / N * 100
}
const between = (v, low, high, what) => assert.ok(v >= low && v <= high, `${what}: ${v.toFixed(1)}% not in ${low}-${high}`)
const spread = (s) => { for (let i = 0; i < 18; i++) s[STATS[i % 7]]++; return s }
between(rate(s => s, s => s), 46, 54, 'mirror')
between(rate(spread, s => s), 60, 82, 'six levels of points should help, not decide')
for (const stat of STATS) between(rate(s => { s[stat] += 18; return s }, spread), 42, 58, `all points into ${stat}`)
for (const t of TACTICS) between(rate(s => s, s => s, t.id, t.beats), 54, 68, `${t.id} against ${t.beats}`)
console.log('all squad checks passed')
