// The Squad game: six cards, one of each power type, that rank up. Pure rules and the battle engine, no database
// and no screen. The same seed always plays out the same battle. Balance check: node lib/squad.test.mjs
import { BEATS, POWER_TYPES, RANKS, STATS } from './game.js'

export const SQUAD_SIZE = POWER_TYPES.length
export const START_TOTAL = 350 // every new card has the same total; only the shape differs
export const POINTS_PER_UPGRADE = 3
// card ranks, lowest first: how many upgrades each takes to leave, and what one upgrade costs there
export const CARD_RANKS = ['E', 'D', 'C', 'B', 'A', 'S']
export const UPGRADES_PER_RANK = [3, 4, 5, 6, 7]
export const UPGRADE_COST = [1, 2, 3, 5, 8]
export const RANK_START = UPGRADES_PER_RANK.reduce((at, n) => [...at, at.at(-1) + n], [0]) // upgrades made when each rank begins
export const MAX_UPGRADES = RANK_START.at(-1)
const TOP = CARD_RANKS.length - 1
export const DAILY_FIGHTS = 5
// coins: one for every season point ever earned, plus rewards, less what was spent
export const PRICES = { extra: 10, reset: 30 }
export const EXTRA_PER_WEEK = 3
export const WIN_POINTS = 5 // season points for beating a rival, once per rival per day
export const coinsOf = (allTimePoints, squad) => Math.max(0, Math.floor(Number(allTimePoints || 0)) + (squad?.gifts || 0) - (squad?.spent || 0))
export const fightsLeft = (squad, day) => DAILY_FIGHTS + (squad?.day === day ? (squad.bonus || 0) - squad.fights : 0)

export const rankOf = (upgrades) => RANK_START.findLastIndex(start => upgrades >= start)
export const upgradeCost = (upgrades) => UPGRADE_COST[rankOf(upgrades)] // undefined at the top rank
export const statCap = (upgrades) => 75 + 2 * upgrades

// traits: any card can take one at D and another at B, each picked from three drawn for that card
export const TRAITS = {
  power: { name: 'Heavy Hitter', hint: 'Deals more damage', deal: 1.05 },
  iron: { name: 'Iron Skin', hint: 'Takes less damage', take: 0.96 },
  eye: { name: 'Sharp Eye', hint: 'More critical hits', crit: 0.08 },
  reflex: { name: 'Quick Reflexes', hint: 'Counters more often', counter: 0.12 },
  vigor: { name: 'Deep Reserves', hint: 'More health', health: 1.04 },
  start: { name: 'Head Start', hint: 'Enters with its special partly charged', meter: 30 },
  wind: { name: 'Second Wind', hint: 'Recovers extra health after a knockout', heal: 0.06 },
}
export const TRAIT_RANKS = [1, 3]
// what every card gains by reaching a rank
export const RANK_PERKS = {
  quick: { rank: 2, name: 'Fast Special', hint: 'Special move charges faster', charge: 1.2 },
  burst: { rank: 4, name: 'Strong Special', hint: 'Special move hits harder', burst: 1.18 },
  awaken: { rank: 5, name: 'Awakening', hint: 'Hits much harder when low on health', fury: 0.2 },
}
const PERKS = { ...TRAITS, ...RANK_PERKS }
export const traitSlots = (upgrades) => TRAIT_RANKS.filter(rank => rankOf(upgrades) >= rank).length
export const traitPending = (card) => (card.traits?.length || 0) < traitSlots(card.upgrades)
// fixed by the card and how many it has, so closing and reopening never rerolls them
export const traitChoices = (card) => draw(Object.keys(TRAITS).filter(id => !card.traits?.includes(id)), 3, seeded(card.card_id * 31 + (card.traits?.length || 0)))
export const perksOf = (card) => [
  ...(card.traits || []).slice(0, traitSlots(card.upgrades)),
  ...Object.keys(RANK_PERKS).filter(id => rankOf(card.upgrades) >= RANK_PERKS[id].rank),
]
const times = (f, key) => (f.perks || []).reduce((n, id) => n * (PERKS[id][key] ?? 1), 1)
const plus = (f, key) => (f.perks || []).reduce((n, id) => n + (PERKS[id][key] ?? 0), 0)

// what a card is waiting for, as [badge, words]
export const cardNote = (card, pool) => traitPending(card) ? ['Trait', 'a trait to choose']
  : card.points ? [`+${card.points}`, `${card.points} stat points to spend`]
  : pool >= poolCost(card) ? ['Up', 'ready to upgrade'] : null

// spare cards can be used up to upgrade another; the same character is worth double
export const FEED_VALUE = [1, 2, 5, 12, 25, 50]
export const feedValue = (source, same) => FEED_VALUE[rankOf(source.upgrades)] * (same ? 2 : 1)
export const pointsToTop = (upgrades) => Array.from({ length: MAX_UPGRADES - upgrades }, (_, i) => upgradeCost(upgrades + i)).reduce((a, b) => a + b, 0)
// what the next upgrade takes from the shared pool after the card's own points
export const poolCost = (card) => Math.max(0, upgradeCost(card.upgrades) - (card.fed || 0)) // NaN at the top rank

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
  low: 0.35, // the share of health under which an awakening starts
  stance: { attack: { deal: 1.09, take: 1.07, counter: 0 }, guard: { deal: 0.91, take: 0.9, counter: 0 }, counter: { deal: 0.98, take: 1, counter: 0.1 } },
}

const clamp = (v, low, high) => Math.min(high, Math.max(low, v))
const total = (stats) => STATS.reduce((n, s) => n + stats[s], 0)
const over = (stat) => stat - 50
export const maxHp = (stats) => Math.round(K.hp + over(stats.aura) * K.hpPerAura)
export const fighterHp = (f) => Math.round(maxHp(f.stats) * times(f, 'health'))

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

// a card of any rank starts from the same shape, with that rank's stat points still to place
export const newCard = (character, rank = 0) => ({ character_id: character.character_id, upgrades: RANK_START[rank], points: RANK_START[rank] * POINTS_PER_UPGRADE, stats: startingStats(character), traits: [] })

export const squadStrength = (cards) => Math.round(cards.reduce((n, c) => n + c.upgrades, 0) / (cards.length || 1))
export const squadRank = (cards) => rankOf(squadStrength(cards))
// ranked battles stay within one squad rank, so nobody farms or gets farmed
export const inReach = (mine, theirs) => Math.abs(squadRank(mine) - squadRank(theirs)) <= 1

// the most loved top-rated characters of each type: never offered as a starting choice
export function bigNames(characters) {
  return new Set(POWER_TYPES.flatMap(type => characters.filter(c => c.power_type === type && c.overall >= 90)
    .sort((a, b) => b.favourites - a.favourites).slice(0, 4).map(c => c.character_id)))
}

function draw(list, count, r) {
  const pool = [...list], out = []
  while (out.length < count && pool.length) out.push(...pool.splice(Math.floor(r() * pool.length), 1))
  return out
}
// an index, as likely as its weight
function weighted(odds, r) {
  let roll = r() * odds.reduce((a, b) => a + b, 0)
  return odds.findIndex(weight => (roll -= weight) < 0)
}

// three random starting choices of each type
export function drawOffers(characters, r) {
  const big = bigNames(characters)
  return Object.fromEntries(POWER_TYPES.map(type => [type,
    draw(characters.filter(c => c.power_type === type && !big.has(c.character_id)), 3, r).map(c => c.character_id)]))
}

// finding a card: usually low rank and rarely a big name
export const FIND_ODDS = [70, 18, 8, 3, 0.9, 0.1] // E to S
export const BIG_ODDS = 0.05
function pickCharacter(characters, big, r) {
  const names = bigNames(characters)
  return draw(characters.filter(c => names.has(c.character_id) === big), 1, r)[0].character_id
}
export function drawFind(characters, r, floor = 0) {
  const big = r() < BIG_ODDS
  return { character_id: pickCharacter(characters, big, r), rank: Math.max(floor, weighted(FIND_ODDS, r)), big }
}

// the market: six cards a day. Higher ranks need a higher player rank; big names cost more.
export const MARKET_PRICES = [100, 300, 700, 1500, 3500, 8000]
export const BIG_PRICE = 3
export const RANK_GATES = [null, null, 'Ronin', 'Veteran', 'Warlord', 'Sovereign'] // player rank needed, E to S
export const marketOpen = (rank, seasonPoints) => Number(seasonPoints || 0) >= (RANKS.find(r => r.name === RANK_GATES[rank])?.min || 0)
export function drawMarket(characters, r) {
  const offer = (rank, big = false) => ({ character_id: pickCharacter(characters, big, r), rank, big, price: MARKET_PRICES[rank] * (big ? BIG_PRICE : 1) })
  return [offer(0), offer(0), offer(1), offer(2), offer(3 + weighted([80, 18, 2], r)), offer(weighted(FIND_ODDS, r), true)]
}

// rewards: one surprise a day, and a bigger bundle once a week
export const DAILY_REWARDS = [
  { kind: 'coins', amount: 60, odds: 40 },
  { kind: 'points', amount: 2, odds: 30 },
  { kind: 'battle', amount: 1, odds: 15 },
  { kind: 'card', amount: 1, odds: 15 },
]
export const WEEKLY_REWARD = { coins: 200, points: 3, floor: 1 } // and a card of at least this rank
export const drawDaily = (r) => DAILY_REWARDS[weighted(DAILY_REWARDS.map(x => x.odds), r)]
export const rewardsDue = (squad, day, week) => ({ daily: !!squad && squad.claimed_day !== day, weekly: !!squad && squad.claimed_week !== week })

// the same shape at a different size
function resized(stats, size) {
  const scale = size / total(stats)
  return Object.fromEntries(STATS.map(s => [s, Math.round(stats[s] * scale)]))
}
// spars: both sides shrink to the same total, so only the shape of each build counts
export const evened = (stats) => resized(stats, START_TOTAL)

// cups take turns at these rank limits; a higher card is brought down to the top of the limit
export const CUP_RANKS = [1, 3, TOP]
export const cupName = (rank) => rank < TOP ? `${CARD_RANKS[rank]} Rank Cup` : 'Open Cup'
export function capped(card, rank) {
  const most = rank < TOP ? RANK_START[rank + 1] - 1 : MAX_UPGRADES
  if (card.upgrades <= most) return card
  const size = START_TOTAL + most * POINTS_PER_UPGRADE
  return { ...card, upgrades: most, stats: total(card.stats) > size ? resized(card.stats, size) : card.stats }
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

// One against one, in order; the winner stays on. Teams: { tactic, fighters: [{ power_type, stats, perks }] }.
// Every event carries the full picture, so the screen only has to show it.
export function simulate(teamA, teamB, seed) {
  const r = seeded(seed)
  const events = []
  const teams = { a: teamA, b: teamB }
  const at = { a: 0, b: 0 }
  const now = {}
  const enter = (side) => { const f = teams[side].fighters[at[side]]; now[side] = { f, hp: fighterHp(f), meter: plus(f, 'meter'), awake: false } }
  const other = (side) => side === 'a' ? 'b' : 'a'
  const log = (kind, by, damage = 0) => events.push({ kind, by, damage, a: at.a, b: at.b, hp: { a: now.a.hp, b: now.b.hp }, meter: { a: now.a.meter, b: now.b.meter } })

  const damage = (side, power) => {
    const me = now[side].f, them = now[other(side)].f
    const mine = teams[side].tactic, theirs = teams[other(side)].tactic
    const per = power === 'magic' ? K.perMagic : K.perStrength
    const raw = Math.max(K.minHit, K.base + over(me.stats[power]) * per - over(them.stats.defence) * K.perDefence)
    const edge = (BEATS[me.power_type] === them.power_type ? K.type : 1) *
      (TACTICS.find(t => t.id === mine).beats === theirs ? K.tactic : 1)
    return raw * edge * K.stance[mine].deal * K.stance[theirs].take * times(me, 'deal') * times(them, 'take') * (low(side) ? 1 + plus(me, 'fury') : 1) * (1 - K.swing + r() * K.swing * 2)
  }
  const hurt = (side, amount) => { const n = Math.max(1, Math.round(amount)); now[side].hp = Math.max(0, now[side].hp - n); return n }

  const low = (side) => now[side].hp < fighterHp(now[side].f) * K.low
  // shown once, the first time an awakened card runs low
  const wake = (side) => {
    if (!now[side].hp || now[side].awake || !low(side) || !plus(now[side].f, 'fury')) return
    now[side].awake = true
    log('awaken', side)
  }

  // returns the side that was knocked out, if any
  const strike = (side) => {
    const me = now[side], foe = other(side)
    me.meter = Math.min(100, me.meter + Math.round((K.charge + over(me.f.stats.magic) * K.perMagic * K.chargeShare) * times(me.f, 'charge')))
    const special = me.meter >= 100
    if (special) me.meter = 0
    const crit = r() < K.crit + over(me.f.stats.technique) * K.critPerTech + plus(me.f, 'crit')
    // a special uses magic, but is never weaker than an ordinary hit would have been
    const blow = special ? Math.max(damage(side, 'magic'), damage(side, 'strength')) * K.special * times(me.f, 'burst') : damage(side, 'strength')
    const dealt = hurt(foe, blow * (crit ? K.critHit : 1))
    log(special ? 'special' : crit ? 'crit' : 'hit', side, dealt)
    if (!now[foe].hp) return foe
    wake(foe)
    if (r() < K.counter + over(now[foe].f.stats.iq) * K.counterPerIq + K.stance[teams[foe].tactic].counter + plus(now[foe].f, 'counter')) {
      log('counter', foe, hurt(side, damage(foe, 'strength') * K.counterHit))
      if (!me.hp) return side
      wake(side)
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
    if (!down && turn >= 200) { down = a.hp / fighterHp(a.f) >= b.hp / fighterHp(b.f) ? 'b' : 'a'; now[down].hp = 0 }
    if (!down) continue
    log('ko', other(down))
    at[down]++
    if (at[down] >= teams[down].fighters.length) { at[down]--; return { winner: other(down), events } }
    const stays = now[other(down)]
    stays.hp = Math.min(fighterHp(stays.f), stays.hp + Math.round(fighterHp(stays.f) * (K.rest + plus(stays.f, 'heal'))))
    enter(down); log('enter', down)
    turn = 0
  }
}
