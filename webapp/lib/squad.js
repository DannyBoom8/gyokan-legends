// The Squad game: three fighters who grow. Pure rules and the battle engine, no database and no screen.
// The same seed always plays out the same battle. Balance check: node lib/squad.test.mjs
import { BEATS, STATS } from './game.js'

export const SQUAD_SIZE = 3
export const START_TOTAL = 350 // every new fighter has the same total; only the shape differs
export const POINTS_PER_LEVEL = 3
export const MAX_LEVEL = 30
export const DAILY_FIGHTS = 5
// credits come from the lineup's battle night points, one each. They never raise a stat or give a level.
export const PRICES = { extra: 10, reset: 30 }
export const EXTRA_PER_WEEK = 3
export const creditsOf = (allTimePoints, squad) => Math.max(0, Math.floor(Number(allTimePoints || 0)) - (squad?.spent || 0))
export const fightsLeft = (squad, day) => DAILY_FIGHTS + (squad?.day === day ? (squad.bonus || 0) - squad.fights : 0)

export const statCap = (level) => 75 + 2 * (level - 1)
export const xpToNext = (level) => 40 + 20 * (level - 1)

export const STAT_JOBS = {
  strength: 'Normal hits hit harder',
  speed: 'Usually strikes first, sometimes twice',
  defence: 'Takes less damage',
  technique: 'More critical hits',
  magic: 'Special move charges faster, hits harder',
  iq: 'Counters more often',
  aura: 'More health',
}

export const TACTICS = [
  { id: 'attack', name: 'Attack', beats: 'guard', hint: 'Hit harder, take more. Breaks Guard.' },
  { id: 'guard', name: 'Guard', beats: 'counter', hint: 'Take less, hit softer. Shuts down Counter.' },
  { id: 'counter', name: 'Counter', beats: 'attack', hint: 'Strike back more often. Punishes Attack.' },
]

// Every number that shapes a fight; tune here and run the test. "per" values are what each point
// above or below 50 is worth, so changing one only changes how much that stat matters.
export const K = {
  hp: 91, hpPerAura: 0.61,
  base: 24, perStrength: 0.19, perMagic: 0.92, perDefence: 0.15, minHit: 4, swing: 0.1,
  special: 1.5, charge: 36, chargeShare: 0.5,
  crit: 0.15, critPerTech: 0.014, critHit: 1.6,
  counter: 0.15, counterPerIq: 0.021, counterHit: 0.65,
  perSpeed: 0.0062, extraMax: 0.5,
  type: 1.2, tactic: 1.06, rest: 0.15,
  stance: { attack: { deal: 1.09, take: 1.07, counter: 0 }, guard: { deal: 0.91, take: 0.9, counter: 0 }, counter: { deal: 0.98, take: 1, counter: 0.1 } },
}

const clamp = (v, low, high) => Math.min(high, Math.max(low, v))
const total = (stats) => STATS.reduce((n, s) => n + stats[s], 0)
const over = (stat) => stat - 50
export const maxHp = (stats) => Math.round(K.hp + over(stats.aura) * K.hpPerAura)

// a character's database stats decide the shape of the new fighter, not its size
export function startingStats(character) {
  const raw = STATS.map(s => character[s] ?? 50)
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length
  const out = raw.map(v => clamp(Math.round(50 + (v - mean) * 1.2), 25, 70))
  const strongest = raw.map((_, i) => i).sort((a, b) => raw[b] - raw[a])
  let off = START_TOTAL - out.reduce((a, b) => a + b, 0)
  for (let n = 0; off !== 0; n++) {
    const i = strongest[n % strongest.length], step = Math.sign(off)
    if (out[i] + step >= 25 && out[i] + step <= 70) { out[i] += step; off -= step }
  }
  return Object.fromEntries(STATS.map((s, i) => [s, out[i]]))
}

export const newFighter = (character) => ({ character_id: character.character_id, level: 1, xp: 0, points: 0, stats: startingStats(character) })

// adds XP to a fighter and returns how many levels it gained
export function gainXp(fighter, xp) {
  let gained = 0
  fighter.xp += xp
  while (fighter.level < MAX_LEVEL && fighter.xp >= xpToNext(fighter.level)) {
    fighter.xp -= xpToNext(fighter.level)
    fighter.level++
    fighter.points += POINTS_PER_LEVEL
    gained++
  }
  if (fighter.level === MAX_LEVEL) fighter.xp = 0
  return gained
}

export const squadLevel = (fighters) => Math.round(fighters.reduce((n, f) => n + f.level, 0) / (fighters.length || 1))

// stronger opponents teach more; beating the same one again teaches half as much each time
export function xpFor(won, myLevel, theirLevel, repeats) {
  const gap = clamp(1 + 0.15 * (theirLevel - myLevel), 0.25, 1.5)
  return Math.max(1, Math.round((won ? 30 : 15) * gap / 2 ** repeats))
}

// the same shape at a different size
function resized(stats, size) {
  const scale = size / total(stats)
  return Object.fromEntries(STATS.map(s => [s, Math.round(stats[s] * scale)]))
}
// spars: both sides shrink to the same total, so only the shape of each build counts
export const evened = (stats) => resized(stats, START_TOTAL)

// cups take turns at these level limits; a stronger fighter is brought down to the limit
export const CUP_LIMITS = [3, 6, MAX_LEVEL]
export const cupName = (limit) => limit < MAX_LEVEL ? `Level ${limit} Cup` : 'Open Cup'
export function capped(fighter, limit) {
  if (fighter.level <= limit) return fighter
  const most = START_TOTAL + (limit - 1) * POINTS_PER_LEVEL
  return { ...fighter, level: limit, stats: total(fighter.stats) > most ? resized(fighter.stats, most) : fighter.stats }
}

// seed numbers in knockout order, best against worst: 4 entrants give 0 v 3 and 1 v 2.
// A number past the last entrant is a bye, which falls to the best seeds.
export function bracket(entrants) {
  let order = [0]
  while (order.length < entrants) order = order.flatMap(s => [s, order.length * 2 - 1 - s])
  return order
}

export function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
}

// One against one, in order; the winner stays on. Teams: { tactic, fighters: [{ power_type, stats }] }.
// Every event carries the full picture, so the screen only has to show it.
export function simulate(teamA, teamB, seed) {
  const r = seeded(seed)
  const events = []
  const teams = { a: teamA, b: teamB }
  const at = { a: 0, b: 0 }
  const now = {}
  const enter = (side) => { const f = teams[side].fighters[at[side]]; now[side] = { f, hp: maxHp(f.stats), meter: 0 } }
  const other = (side) => side === 'a' ? 'b' : 'a'
  const log = (kind, by, damage = 0) => events.push({ kind, by, damage, a: at.a, b: at.b, hp: { a: now.a.hp, b: now.b.hp }, meter: { a: now.a.meter, b: now.b.meter } })

  const damage = (side, power) => {
    const me = now[side].f, them = now[other(side)].f
    const mine = teams[side].tactic, theirs = teams[other(side)].tactic
    const per = power === 'magic' ? K.perMagic : K.perStrength
    const raw = Math.max(K.minHit, K.base + over(me.stats[power]) * per - over(them.stats.defence) * K.perDefence)
    const edge = (BEATS[me.power_type] === them.power_type ? K.type : 1) *
      (TACTICS.find(t => t.id === mine).beats === theirs ? K.tactic : 1)
    return raw * edge * K.stance[mine].deal * K.stance[theirs].take * (1 - K.swing + r() * K.swing * 2)
  }
  const hurt = (side, amount) => { const n = Math.max(1, Math.round(amount)); now[side].hp = Math.max(0, now[side].hp - n); return n }

  // returns the side that was knocked out, if any
  const strike = (side) => {
    const me = now[side], foe = other(side)
    me.meter = Math.min(100, me.meter + Math.round(K.charge + over(me.f.stats.magic) * K.perMagic * K.chargeShare))
    const special = me.meter >= 100
    if (special) me.meter = 0
    const crit = r() < K.crit + over(me.f.stats.technique) * K.critPerTech
    // a special uses magic, but is never weaker than an ordinary hit would have been
    const blow = special ? Math.max(damage(side, 'magic'), damage(side, 'strength')) * K.special : damage(side, 'strength')
    const dealt = hurt(foe, blow * (crit ? K.critHit : 1))
    log(special ? 'special' : crit ? 'crit' : 'hit', side, dealt)
    if (!now[foe].hp) return foe
    if (r() < K.counter + over(now[foe].f.stats.iq) * K.counterPerIq + K.stance[teams[foe].tactic].counter) {
      log('counter', foe, hurt(side, damage(foe, 'strength') * K.counterHit))
      if (!me.hp) return side
    }
    return null
  }

  enter('a'); enter('b'); log('enter', null)
  for (let turn = 0; ; turn++) {
    const { a, b } = now
    const gap = a.f.stats.speed - b.f.stats.speed
    // the faster one usually moves first and sometimes gets a second go
    const first = r() < clamp(0.5 + gap * K.perSpeed, 0.1, 0.9) ? 'a' : 'b'
    let down = strike(first)
    if (!down) down = strike(other(first))
    if (!down && r() < Math.min(K.extraMax, Math.abs(gap) * K.perSpeed)) down = strike(gap > 0 ? 'a' : 'b')
    // shortcut: a stalemate after 200 rounds goes to whoever has more health left
    if (!down && turn >= 200) { down = a.hp / maxHp(a.f.stats) >= b.hp / maxHp(b.f.stats) ? 'b' : 'a'; now[down].hp = 0 }
    if (!down) continue
    log('ko', other(down))
    at[down]++
    if (at[down] >= teams[down].fighters.length) { at[down]--; return { winner: other(down), events } }
    const stays = now[other(down)]
    stays.hp = Math.min(maxHp(stays.f.stats), stays.hp + Math.round(maxHp(stays.f.stats) * K.rest))
    enter(down); log('enter', down)
    turn = 0
  }
}
