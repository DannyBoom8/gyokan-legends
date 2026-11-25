// node lib/squad.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { POWER_TYPES, RANKS, STATS, rankFor } from './game.js'
import { CARD_RANKS, CUP_RANKS, DAILY_FIGHTS, EXTRA_PER_WEEK, MAX_UPGRADES, PRICES, RANK_START, SQUAD_SIZE, START_TOTAL, TACTICS, UPGRADE_COST, UPGRADES_PER_RANK, bigNames, bracket, bracketColumns, capped, coinsOf, drawOffers, evened, inReach, maxHp, rankOf, seeded, simulate, startingStats, statCap, upgradeCost,
  BIG_PRICE, DAILY_REWARDS, FEED_VALUE, FIND_ODDS, K, MARKET_PRICES, RANK_PERKS, TRAITS, WEEKLY_REWARD, WIN_POINTS, drawDaily, drawFind, drawMarket, feedValue, fighterHp, marketOpen, newCard, perksOf, pointsToTop, poolCost, rewardsDue, traitChoices, traitPending, traitSlots } from './squad.js'
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

// ranks: E to S, a few upgrades each
assert.deepEqual([MAX_UPGRADES, RANK_START], [25, [0, 3, 7, 12, 18, 25]])
assert.equal([0, 2, 3, 6, 7, 24, 25].map(u => CARD_RANKS[rankOf(u)]).join(''), 'EEDDCAS')
assert.equal(UPGRADES_PER_RANK.reduce((n, count, r) => n + count * UPGRADE_COST[r], 0), 112)
assert.equal(upgradeCost(MAX_UPGRADES), undefined)
assert.ok(Math.abs(total(evened({ ...startingStats(chars[0]), strength: 120 })) - START_TOTAL) <= 4)

// big names: four per type, never offered as a starting choice
const big = bigNames(chars)
assert.equal(big.size, 24)
for (let seed = 1; seed <= 200; seed++) {
  const offers = drawOffers(chars, seeded(seed))
  for (const type of POWER_TYPES) {
    assert.equal(new Set(offers[type]).size, 3)
    assert.ok(offers[type].every(id => !big.has(id) && chars.find(c => c.character_id === id).power_type === type))
  }
}

// the starting squad: any favourite, big name included, plus one offered card for every other type
const db = { characters: chars, squads: [], fighters: [], duels: [] }
seedSquads(db, ['bot-1', 'bot-2', 'bot-3']) // ranks E, D, C
const throws = (fn, words) => assert.throws(fn, new RegExp(words))
const typeOf = (id) => chars.find(c => c.character_id === id).power_type
const favourite = chars.find(c => big.has(c.character_id))
throws(() => SQUAD_RPC.squad_create(db, 'me', { p_favourite: favourite.character_id, p_picks: [] }), 'choices first')
const offers = SQUAD_RPC.squad_offers(db, 'me', {}, 5)
assert.deepEqual(SQUAD_RPC.squad_offers(db, 'me', {}, 99), offers) // asking again never rerolls
const picks = POWER_TYPES.filter(t => t !== favourite.power_type).map(t => offers[t][0])
const create = (p_picks) => SQUAD_RPC.squad_create(db, 'me', { p_favourite: favourite.character_id, p_picks, p_anime: 'Nope' })
throws(() => create(picks.slice(1)), 'each type')
throws(() => create([...picks.slice(0, 4), picks[0]]), 'each type')
const unoffered = [...big].find(id => id !== favourite.character_id && typeOf(id) === typeOf(picks[4]))
throws(() => create([...picks.slice(0, 4), unoffered]), 'each type')
throws(() => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }), 'first')
create(picks)
throws(() => create(picks), 'already')
const cards = () => db.fighters.filter(x => x.user_id === 'me')
assert.equal(cards().length, SQUAD_SIZE)
assert.deepEqual([cards()[0].character_id, cards()[0].slot], [favourite.character_id, 1])
assert.ok(cards().every(c => c.upgrades === 0 && c.points === 0))
assert.equal(new Set(db.fighters.map(c => c.card_id)).size, db.fighters.length)
const squad = db.squads.find(s => s.user_id === 'me')
assert.deepEqual([squad.favourite_character_id, squad.favourite_anime], [favourite.character_id, favourite.anime_title])

// upgrading costs points from the shared pool and gives stat points
const mine = () => cards()[0]
const card = () => ({ p_card: mine().card_id })
throws(() => SQUAD_RPC.squad_upgrade(db, 'me', card()), 'costs 1')
throws(() => SQUAD_RPC.squad_allocate(db, 'me', { ...card(), p_stat: 'speed' }), 'No points')
throws(() => SQUAD_RPC.squad_upgrade(db, 'me', { p_card: db.fighters[0].card_id }), 'Not your card')
squad.pool = 112
for (let i = 0; i < 3; i++) SQUAD_RPC.squad_upgrade(db, 'me', card())
assert.deepEqual([CARD_RANKS[rankOf(mine().upgrades)], mine().points, squad.pool], ['D', 9, 109])
for (let i = 3; i < MAX_UPGRADES; i++) SQUAD_RPC.squad_upgrade(db, 'me', card())
assert.deepEqual([CARD_RANKS[rankOf(mine().upgrades)], squad.pool], ['S', 0])
throws(() => SQUAD_RPC.squad_upgrade(db, 'me', card()), 'top rank')
mine().stats.speed = statCap(MAX_UPGRADES)
throws(() => SQUAD_RPC.squad_allocate(db, 'me', { ...card(), p_stat: 'speed' }), 'limit')
Object.assign(mine(), { upgrades: 0, points: 0, stats: startingStats(favourite) })

// battles: spars leave no trace; ranked stays within one squad rank and pays one point per rival per day
const spar = SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-3', p_ranked: false }, 5, '2026-01-01')
assert.deepEqual([spar.earned, spar.fightsLeft, db.duels.length, squad.pool], [0, DAILY_FIGHTS, 0, 0])
throws(() => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'nobody', p_ranked: false }, 1, '2026-01-01'), "haven't picked")
throws(() => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'me', p_ranked: false }, 1, '2026-01-01'), 'yourself')
const line = (id) => db.fighters.filter(x => x.user_id === id)
assert.ok(inReach(line('me'), line('bot-2')) && !inReach(line('me'), line('bot-3')))
throws(() => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-3', p_ranked: true }, 1, '2026-01-01'), 'within one rank')
db.user_ranks = [{ user_id: 'me', season_points: 96, all_time_points: 96 }]
const results = Array.from({ length: DAILY_FIGHTS }, (_, i) => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }, 100 + i, '2026-01-01'))
const wins = results.filter(x => x.winner === 'a').length
assert.ok(wins > 1, `want more than one win here to exercise the once-a-day rule, got ${wins}`)
assert.deepEqual([results.reduce((n, x) => n + x.earned, 0), squad.pool], [1, 1])
assert.deepEqual([results.reduce((n, x) => n + x.points, 0), db.user_ranks[0].season_points, db.user_ranks[0].current_rank], [WIN_POINTS, 101, 'Ronin'])
// ranked battles go on the challenger's record only
const standings = leaderboardRows({ ...db, users: [], user_ranks: [{ user_id: 'me' }, { user_id: 'bot-1' }], guilds: [], guild_members: [], gameweeks: [], fantasy_points: [] })
assert.equal(standings[0].duel_wins + standings[0].duel_losses, DAILY_FIGHTS)
assert.equal(standings[1].duel_wins + standings[1].duel_losses, 0)
assert.deepEqual([db.duels[0].week, db.duels[0].opponent_id], ['2025-12-29', 'bot-1'])
throws(() => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }, 1, '2026-01-01'), 'No ranked battles')
assert.equal(SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }, 100, '2026-01-02').fightsLeft, DAILY_FIGHTS - 1)

// swapping: only for another card of the same type, and the one that leaves keeps its rank
const out = mine()
const twin = { ...out, card_id: 900, slot: null } // two of the same character is allowed
const wrongType = { ...cards()[1], card_id: 901, slot: null }
db.fighters.push(twin, wrongType)
out.upgrades = 4
throws(() => SQUAD_RPC.squad_swap(db, 'me', { p_slot: 1, p_card: 901 }), 'each type')
SQUAD_RPC.squad_swap(db, 'me', { p_slot: 1, p_card: 900 })
assert.deepEqual([out.slot, out.upgrades, twin.slot], [null, 4, 1])
SQUAD_RPC.squad_swap(db, 'me', { p_slot: 1, p_card: out.card_id })
SQUAD_RPC.squad_move_up(db, 'me', { p_slot: 2 })
assert.equal(out.slot, 2)
SQUAD_RPC.squad_move_up(db, 'me', { p_slot: 2 })
db.fighters = db.fighters.filter(c => c.card_id < 900)
Object.assign(out, { upgrades: 2, points: 0 })

// coins: one per season point plus rewards, spent on a few extra battles or on taking points back
const bank = { user_id: 'me', all_time_points: 0 }
db.user_ranks = [bank]
const buy = () => SQUAD_RPC.squad_buy_battle(db, 'me', {}, '2026-02-02', '2026-02-02')
const battle = (day) => SQUAD_RPC.squad_battle(db, 'me', { p_opponent: 'bot-1', p_ranked: true }, 1, day)
throws(buy, 'Not enough')
bank.all_time_points = 100.5
assert.equal(coinsOf(bank.all_time_points, squad), 100)
for (let i = 0; i < EXTRA_PER_WEEK; i++) buy()
throws(buy, 'a week')
for (let i = 0; i < DAILY_FIGHTS + EXTRA_PER_WEEK; i++) battle('2026-02-02')
throws(() => battle('2026-02-02'), 'No ranked battles')
assert.equal(battle('2026-02-03').fightsLeft, DAILY_FIGHTS - 1) // bought battles don't carry over
const earned = mine().upgrades * 3
mine().stats = { ...startingStats(favourite), speed: startingStats(favourite).speed + 2 }
mine().points = earned - 2
SQUAD_RPC.squad_reset(db, 'me', card())
assert.deepEqual([mine().points, mine().stats], [earned, startingStats(favourite)])
assert.equal(coinsOf(bank.all_time_points, squad), Math.floor(bank.all_time_points) - PRICES.extra * EXTRA_PER_WEEK - PRICES.reset)
throws(() => SQUAD_RPC.squad_reset(db, 'me', card()), 'No placed points')

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

// cup: higher cards come down to the top of the rank limit, lower ones are untouched
const veteran = { upgrades: 20, stats: Object.fromEntries(STATS.map(s => [s, 50 + 8])) }
assert.equal(capped(veteran, 1).upgrades, RANK_START[2] - 1) // top of D
assert.ok(Math.abs(total(capped(veteran, 1).stats) - (START_TOTAL + 18)) <= 4)
assert.equal(capped(veteran, CARD_RANKS.length - 1), veteran)
assert.deepEqual(capped({ upgrades: 20, stats: startingStats(chars[0]) }, 1).stats, startingStats(chars[0])) // unplaced points add nothing
const lopsided = capped({ upgrades: 25, stats: { ...startingStats(chars[0]), strength: 125 } }, 1)
assert.ok(STATS.every(s => lopsided.stats[s] <= statCap(RANK_START[2] - 1))) // no stat a D card couldn't have
assert.ok(total(lopsided.stats) <= START_TOTAL + 18 + 4)
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
assert.deepEqual([cup.limit, cup.entrants, cup.rounds.map(r => r.length)], [CUP_RANKS[0], 3, [1, 1]])
const final = cup.rounds.at(-1)[0]
assert.equal(cup.champion.party_id, final[final.winner].party_id)
assert.ok(cup.rounds.flat().every(m => m.bouts.every(b => !b.battle || [...b.battle.a.fighters, ...b.battle.b.fighters].every(f => rankOf(f.upgrades) <= cup.limit))))
throws(() => SQUAD_RPC.cup_play(db, 'me', {}, 1, 'w1'), 'been played')
// the drawn bracket: the bye goes back in its place, and each match feeds the side it came from
const [first, [decider]] = bracketColumns(cup.rounds)
assert.equal(first.length, 2)
assert.equal(first.filter(s => s.bye).length, 1)
assert.ok(['a', 'b'].every((side, i) => (first[i].bye || first[i][first[i].winner]).party_id === decider[side].party_id))
// the badge goes to the winners who had a squad, and to nobody else
const winners = members.filter(([id, party]) => party === cup.champion.party_id && db.squads.some(s => s.user_id === id)).map(([id]) => id)
assert.deepEqual([...cup.champion.members].sort(), winners.sort())
const badges = leaderboardRows({ ...db, users: [], user_ranks: members.map(([user_id]) => ({ user_id })), guild_members: [], duels: [], gameweeks: [], fantasy_points: [] })
assert.deepEqual(badges.filter(r => r.cup_wins === 1).map(r => r.user_id).sort(), winners)
SQUAD_RPC.cup_next(db, 'me', {}, 'w1')
assert.equal(SQUAD_RPC.cup_play(db, 'me', {}, 2, 'w1').limit, CUP_RANKS[1])

// the ladder
assert.deepEqual([RANKS.length, RANKS[0].min, RANKS.at(-1).min], [10, 0, 5500])
assert.ok(RANKS.every((r, i) => !i || r.min > RANKS[i - 1].min))
assert.deepEqual([rankFor(0), rankFor(99.9), rankFor(100), rankFor(9999)], ['Rookie', 'Rookie', 'Ronin', 'Legendary'])

// traits: a slot at D and another at B, three fixed choices each, never the same one twice
const game = { characters: chars, squads: [], fighters: [], duels: [], user_ranks: [{ user_id: 'p', season_points: 0, all_time_points: 0 }] }
const hand = SQUAD_RPC.squad_offers(game, 'p', {}, 8)
SQUAD_RPC.squad_create(game, 'p', { p_favourite: favourite.character_id, p_picks: POWER_TYPES.filter(t => t !== favourite.power_type).map(t => hand[t][0]) })
const owner = game.squads[0]
const held = () => game.fighters.filter(c => c.user_id === 'p')
const hero = () => held()[0]
const at = (p_card = hero().card_id) => ({ p_card })
assert.deepEqual([0, 3, 11, 12, 25].map(traitSlots), [0, 1, 1, 2, 2])
throws(() => SQUAD_RPC.squad_trait(game, 'p', { ...at(), p_trait: 'power' }), 'No trait')
Object.assign(hero(), { upgrades: 3, points: 9 })
const choices = traitChoices(hero())
assert.deepEqual([new Set(choices).size, traitChoices(hero())], [3, choices])
assert.ok(choices.every(id => TRAITS[id]))
throws(() => SQUAD_RPC.squad_trait(game, 'p', { ...at(), p_trait: Object.keys(TRAITS).find(id => !choices.includes(id)) }), 'three choices')
SQUAD_RPC.squad_trait(game, 'p', { ...at(), p_trait: choices[0] })
assert.ok(!traitPending(hero()))
hero().upgrades = 25
assert.ok(!traitChoices(hero()).includes(choices[0]))
SQUAD_RPC.squad_trait(game, 'p', { ...at(), p_trait: traitChoices(hero())[1] })
assert.deepEqual(perksOf(hero()).slice(2), Object.keys(RANK_PERKS))
assert.deepEqual(perksOf({ ...hero(), upgrades: 7 }), [choices[0], 'quick']) // a cup limit takes the later ones away
assert.deepEqual(perksOf(capped(hero(), 0)), [])

// spreading places every point it can, within the card's limit
hero().points = 75
SQUAD_RPC.squad_spread(game, 'p', at())
assert.deepEqual([hero().points, total(hero().stats)], [0, START_TOTAL + 75])
assert.ok(STATS.every(s => hero().stats[s] <= statCap(25)))
throws(() => SQUAD_RPC.squad_spread(game, 'p', at()), 'No points')

// using up cards: spare and unlocked only, the same character counts double, own points are spent first
Object.assign(hero(), { upgrades: 0, points: 0, traits: [] })
const spare = (character, rank = 0) => { game.fighters.push({ ...newCard(character, rank), card_id: 500 + game.fighters.length, user_id: 'p', slot: null }); return game.fighters.at(-1) }
const other = chars.find(c => c.character_id !== favourite.character_id)
const feed = (used) => SQUAD_RPC.squad_feed(game, 'p', { ...at(), p_use: used.card_id })
throws(() => feed(hero()), 'different')
throws(() => feed(held()[1]), 'in your squad')
const locked = spare(other, 1)
SQUAD_RPC.squad_lock(game, 'p', at(locked.card_id))
throws(() => feed(locked), 'locked')
SQUAD_RPC.squad_lock(game, 'p', at(locked.card_id))
locked.fed = 3
feed(locked)
feed(spare(favourite, 2))
assert.deepEqual([hero().fed, held().length], [FEED_VALUE[1] + 3 + FEED_VALUE[2] * 2, SQUAD_SIZE])
assert.equal(poolCost(hero()), 0)
for (let i = 0; i < 3; i++) SQUAD_RPC.squad_upgrade(game, 'p', at())
assert.deepEqual([hero().fed, owner.pool], [15 - 3, 0])
hero().fed = pointsToTop(hero().upgrades)
const extra = spare(other)
throws(() => feed(extra), 'no more points')
assert.deepEqual([pointsToTop(0), pointsToTop(25)], [112, 0])
// upgrading a card before using it up never pays back what the upgrades cost
for (let rank = 1; rank < 6; rank++) assert.ok((FEED_VALUE[rank] - FEED_VALUE[0]) * 2 < pointsToTop(0) - pointsToTop(RANK_START[rank]), CARD_RANKS[rank])
assert.equal(feedValue({ upgrades: 0 }, true), 2)
// a used-up card's number is never handed out again
const last = Math.max(...game.fighters.map(c => c.card_id))
hero().fed = 0
feed(extra)
owner.claimed_day = null
SQUAD_RPC.reward_claim(game, 'p', { p_when: 'weekly' }, 4, '2026-03-02', 'wk')
assert.ok(held().at(-1).card_id > last)

// finds: mostly low and ordinary
const r = seeded(21), found = Array.from({ length: 40000 }, () => drawFind(chars, r))
const share = (test) => found.filter(test).length / found.length * 100
FIND_ODDS.forEach((odds, rank) => assert.ok(Math.abs(share(f => f.rank === rank) - odds) < 0.6, `rank ${CARD_RANKS[rank]}`))
assert.ok(Math.abs(share(f => f.big) - 5) < 0.6)
assert.ok(found.every(f => f.big === big.has(f.character_id)))
assert.deepEqual([newCard(favourite, 3).upgrades, newCard(favourite, 3).points], [RANK_START[3], RANK_START[3] * 3])

// the market: six cards, the last a big name at a higher price
for (let seed = 1; seed <= 300; seed++) {
  const stock = drawMarket(chars, seeded(seed))
  assert.deepEqual(stock.slice(0, 4).map(x => x.rank), [0, 0, 1, 2])
  assert.ok(stock[4].rank >= 3 && stock.slice(0, 5).every(x => !x.big && x.price === MARKET_PRICES[x.rank]))
  assert.ok(stock[5].big && big.has(stock[5].character_id) && stock[5].price === MARKET_PRICES[stock[5].rank] * BIG_PRICE)
}
assert.deepEqual([marketOpen(1, 0), marketOpen(2, 99), marketOpen(2, 100), marketOpen(5, 2699), marketOpen(5, 2700)], [true, false, true, false, true])
const stock = SQUAD_RPC.market_stock(game, 'p', {}, 3, '2026-03-02')
assert.deepEqual(SQUAD_RPC.market_stock(game, 'p', {}, 99, '2026-03-02'), stock)
const buy1 = (p_slot, day = '2026-03-02') => SQUAD_RPC.market_buy(game, 'p', { p_slot }, day)
owner.gifts = 0; owner.spent = 0
throws(() => buy1(0), 'Not enough coins')
throws(() => buy1(9), 'No such card')
throws(() => buy1(4), 'to buy rank')
throws(() => buy1(0, '2026-03-03'), 'new cards')
owner.gifts = 100
const owned = held().length
buy1(0)
assert.deepEqual([held().length, held().at(-1).slot, coinsOf(0, owner)], [owned + 1, null, 0])
throws(() => buy1(0), 'Already bought')

// rewards: once a day and once a week
Object.assign(owner, { claimed_day: null, claimed_week: null, gifts: 0, pool: 0, spent: 0, day: null, bonus: 0 })
assert.deepEqual(rewardsDue(owner, 'd1', 'w1'), { daily: true, weekly: true })
const kinds = new Set()
for (let seed = 1; kinds.size < DAILY_REWARDS.length && seed < 200; seed++) {
  Object.assign(owner, { claimed_day: null, day: null, bonus: 0, gifts: 0, pool: 0 })
  const before = held().length, got = SQUAD_RPC.reward_claim(game, 'p', { p_when: 'daily' }, seed, 'd1', 'w1')
  const kind = Object.keys(got)[0]
  kinds.add(kind)
  assert.deepEqual([owner.gifts, owner.pool, owner.bonus, held().length - before], [got.coins || 0, got.points || 0, got.battle || 0, got.card ? 1 : 0])
}
assert.deepEqual([...kinds].sort(), DAILY_REWARDS.map(x => x.kind).sort())
throws(() => SQUAD_RPC.reward_claim(game, 'p', { p_when: 'daily' }, 1, 'd1', 'w1'), 'tomorrow')
Object.assign(owner, { gifts: 0, pool: 0 })
const weekly = SQUAD_RPC.reward_claim(game, 'p', { p_when: 'weekly' }, 9, 'd1', 'w1')
assert.ok(weekly.card.rank >= WEEKLY_REWARD.floor)
assert.deepEqual([owner.gifts, owner.pool], [WEEKLY_REWARD.coins, WEEKLY_REWARD.points])
throws(() => SQUAD_RPC.reward_claim(game, 'p', { p_when: 'weekly' }, 9, 'd2', 'w1'), 'next week')
throws(() => SQUAD_RPC.reward_claim(game, 'p', { p_when: 'monthly' }, 9, 'd2', 'w1'), 'No such')
assert.deepEqual(rewardsDue(owner, 'd2', 'w1'), { daily: true, weekly: false })
SQUAD_RPC.squad_new_week(game, 'p')
assert.ok(rewardsDue(owner, 'd1', 'w1').weekly)
assert.ok(drawDaily(seeded(1)).amount > 0)

// perks in a fight: health, the head start, the awakening shown once per card
const solo = (perks) => ({ tactic: 'attack', fighters: [{ power_type: 'Physical', stats: startingStats(chars[0]), perks }] })
const tough = { stats: startingStats(chars[0]), perks: ['vigor'] }
assert.ok(fighterHp(tough) > maxHp(tough.stats))
const awake = simulate(solo(['awaken', 'start']), solo([]), 2)
assert.equal(awake.events[0].meter.a, TRAITS.start.meter)
assert.equal(awake.events.filter(e => e.kind === 'awaken').length, 1)
const woke = awake.events.find(e => e.kind === 'awaken')
assert.ok(woke.by === 'a' && woke.hp.a > 0 && woke.hp.a < maxHp(startingStats(chars[0])) * K.low)

// engine: same seed, same fight; the log ends with a knockout and HP stays in range
const team = (cs, tactic = 'attack', tweak = s => s) => ({ tactic, fighters: cs.map(c => ({ power_type: c.power_type, stats: tweak({ ...startingStats(c) }) })) })
// one card of each type
const six = (n) => POWER_TYPES.map(type => chars.filter(c => c.power_type === type)[n])
const one = simulate(team(six(0)), team(six(1), 'guard'), 9)
assert.deepEqual(one, simulate(team(six(0)), team(six(1), 'guard'), 9))
assert.equal(one.events.at(-1).kind, 'ko')
assert.ok(one.events.every(e => e.hp.a >= 0 && e.hp.b >= 0 && e.meter.a <= 100 && e.meter.b <= 100))
assert.ok(maxHp(startingStats(chars[0])) > 0)

// balance, over thousands of fights between random characters
function rate(tweakA, tweakB, tacticA = 'attack', tacticB = 'attack') {
  const r = seeded(3), pick = (list) => list[Math.floor(r() * list.length)], N = 4000
  const squad = () => POWER_TYPES.map(type => pick(chars.filter(c => c.power_type === type))).sort(() => r() - 0.5)
  let wins = 0
  for (let i = 0; i < N; i++) {
    const A = team(squad(), tacticA, tweakA), B = team(squad(), tacticB, tweakB), flip = i % 2
    const out = flip ? simulate(B, A, i + 1) : simulate(A, B, i + 1)
    if ((out.winner === 'a') !== !!flip) wins++
  }
  return wins / N * 100
}
const between = (v, low, high, what) => assert.ok(v >= low && v <= high, `${what}: ${v.toFixed(1)}% not in ${low}-${high}`)
const spread = (s) => { for (let i = 0; i < 18; i++) s[STATS[i % 7]]++; return s }
between(rate(s => s, s => s), 46, 54, 'mirror')
const ahead = (points) => rate(s => { for (let i = 0; i < points; i++) s[STATS[i % 7]]++; return s }, s => s).toFixed(1)
console.log(`win rates for a squad ahead: one upgrade ${ahead(3)}%, E to D ${ahead(9)}%, six upgrades ${ahead(18)}%, S against E ${ahead(75)}%`)
between(rate(spread, s => s), 60, 90, 'six upgrades of points should help, not decide')
for (const stat of STATS) between(rate(s => { s[stat] += 18; return s }, spread), 42, 58, `all points into ${stat}`)
for (const t of TACTICS) between(rate(s => s, s => s, t.id, t.beats), 54, 68, `${t.id} against ${t.beats}`)
// no trait or rank power runs away with a fight, and one rank ahead is an edge, not a certainty
function perkRate(a, b) {
  const r = seeded(3), pick = (list) => list[Math.floor(r() * list.length)], N = 4000
  const squad = () => POWER_TYPES.map(type => pick(chars.filter(c => c.power_type === type))).sort(() => r() - 0.5)
  const build = (cs, make) => ({ tactic: 'attack', fighters: cs.map(c => ({ power_type: c.power_type, ...make(startingStats(c), r) })) })
  let wins = 0
  for (let i = 0; i < N; i++) {
    const A = build(squad(), a), B = build(squad(), b), flip = i % 2
    const out = flip ? simulate(B, A, i + 1) : simulate(A, B, i + 1)
    if ((out.winner === 'a') !== !!flip) wins++
  }
  return wins / N * 100
}
for (const id of [...Object.keys(TRAITS), ...Object.keys(RANK_PERKS)]) between(perkRate(stats => ({ stats, perks: [id] }), stats => ({ stats, perks: [] })), 53, 70, id)
const ranked = (upgrades) => (stats, r) => {
  for (let i = 0; i < upgrades * 3; i++) stats[STATS[i % 7]]++
  const pool = Object.keys(TRAITS), traits = []
  while (traits.length < traitSlots(upgrades)) traits.push(...pool.splice(Math.floor(r() * pool.length), 1))
  return { stats, perks: perksOf({ upgrades, traits }) }
}
const steps = RANK_START.slice(1).map((start, i) => perkRate(ranked(start), ranked(RANK_START[i])))
console.log(`one rank ahead wins: ${steps.map((v, i) => `${CARD_RANKS[i + 1]} v ${CARD_RANKS[i]} ${v.toFixed(0)}%`).join(', ')}`)
steps.forEach((v, i) => between(v, 62, 86, `rank ${CARD_RANKS[i + 1]} against the one below`))
console.log('all squad checks passed')
