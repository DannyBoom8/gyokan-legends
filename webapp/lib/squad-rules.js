// What a player may do with their squad, run against the demo database. When real accounts come back these
// become database or Worker functions: the server must decide every fight, never the browser.
import { POWER_TYPES, STATS, addPoints } from './game.js'
import { weekOf } from './guild-rules.js'
import { CARD_RANKS, CUP_RANKS, EXTRA_PER_WEEK, POINTS_PER_UPGRADE, PRICES, RANK_GATES, RANK_START, SQUAD_SIZE, TACTICS, TRAITS, WEEKLY_REWARD, WIN_POINTS, bracket, capped, coinsOf, drawDaily, drawFind, drawMarket, drawOffers, evened, feedValue, fightsLeft, inReach, marketOpen, newCard, perksOf, pointsToTop, seeded, simulate, squadStrength, startingStats, statCap, traitChoices, traitPending, upgradeCost } from './squad.js'

const fail = (message) => { throw new Error(message) }
const today = (now = new Date()) => now.toISOString().slice(0, 10)
const owned = (db, userId) => db.fighters.filter(f => f.user_id === userId)
const lineOf = (db, userId) => owned(db, userId).filter(f => f.slot).sort((a, b) => a.slot - b.slot)
const character = (db, id) => db.characters.find(c => c.character_id === id) || fail('No such character')
const cardOf = (db, userId, id) => owned(db, userId).find(c => c.card_id === id) || fail('Not your card')
const typeOf = (db, card) => character(db, card.character_id).power_type
const TOP = CARD_RANKS.length - 1
const roll = () => Math.floor(Math.random() * 2 ** 31)

// ids are never reused, even after a card is used up
function addCard(db, userId, card, slot = null) {
  db.cardSeq = Math.max(db.cardSeq || 0, 0, ...db.fighters.map(c => c.card_id)) + 1
  db.fighters.push({ ...card, card_id: db.cardSeq, user_id: userId, slot })
  return db.cardSeq
}

function squadOf(db, userId) {
  return db.squads.find(s => s.user_id === userId) || fail('Pick your starting cards first')
}

// the day's fight count starts over at midnight UTC
function freshDay(squad, day) {
  if (squad.day !== day) Object.assign(squad, { day, fights: 0, bonus: 0, foes: {} })
}

// one squad as the engine wants it; spars even the sizes and drop every trait, cups apply their rank limit
const teamOf = (db, userId, { evenOut = false, limit = TOP } = {}) => ({
  tactic: squadOf(db, userId).tactic,
  fighters: lineOf(db, userId).map(c => capped(c, limit)).map(c => ({
    character_id: c.character_id, upgrades: c.upgrades, power_type: typeOf(db, c),
    stats: evenOut ? evened(c.stats) : { ...c.stats }, perks: evenOut ? [] : perksOf(c),
  })),
})

// a party's members who have a squad, strongest first
const crewOf = (db, party, limit = TOP) => {
  const strength = (id) => squadStrength(lineOf(db, id).map(c => capped(c, limit)))
  return db.guild_party_members.filter(m => m.party_id === party.id)
    .map(m => m.user_id).filter(id => db.squads.some(s => s.user_id === id))
    .sort((x, y) => strength(y) - strength(x))
}

// party against party: squads pair off in order, and an unmatched squad wins its bout
const clash = (db, a, b, seed, limit) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => {
  if (!a[i] || !b[i]) return { a: a[i] || null, b: b[i] || null, winner: a[i] ? 'a' : 'b', battle: null }
  const [x, y] = [teamOf(db, a[i], { limit }), teamOf(db, b[i], { limit })]
  const { winner, events } = simulate(x, y, seed + i)
  return { a: a[i], b: b[i], winner, battle: { winner, events, a: x, b: y, earned: 0, points: 0 } }
})
const winsOf = (bouts, side) => bouts.filter(x => x.winner === side).length
// fighters a side still had up when its bouts ended; an unmatched squad counts in full
const standing = (bouts, side) => bouts.filter(x => x.winner === side)
  .reduce((n, x) => n + (x.battle ? x.battle[side].fighters.length - x.battle.events.at(-1)[side] : SQUAD_SIZE), 0)

// one knockout match; a level score goes to more fighters standing, then to the better seed
function match(db, a, b, seed, limit) {
  const bouts = clash(db, a.crew, b.crew, seed, limit)
  const score = winsOf(bouts, 'a'), against = winsOf(bouts, 'b')
  const margin = score - against || standing(bouts, 'a') - standing(bouts, 'b') || b.seed - a.seed
  const side = (e) => ({ party_id: e.party_id, name: e.name, tag: e.tag, guild_id: e.guild_id })
  return { a: side(a), b: side(b), bouts, score, against, winner: margin > 0 ? 'a' : 'b', tied: score === against }
}

function spend(db, userId, price) {
  const squad = squadOf(db, userId)
  const points = db.user_ranks.find(r => r.user_id === userId)?.all_time_points
  if (coinsOf(points, squad) < price) fail('Not enough coins. Win battles, score with your lineup or claim rewards.')
  squad.spent = (squad.spent || 0) + price
}

function addSquad(db, userId, characters, anime) {
  db.squads.push({ user_id: userId, tactic: 'attack', day: null, fights: 0, bonus: 0, foes: {}, spent: 0, gifts: 0, week: null, extras: 0, pool: 0, claimed_day: null, claimed_week: null, favourite_character_id: characters[0].character_id, favourite_anime: anime || characters[0].anime_title })
  characters.forEach((c, i) => addCard(db, userId, newCard(c), i + 1))
}

export const SQUAD_RPC = {
  // the random starting choices: drawn once and kept, so asking again never rerolls them
  squad_offers(db, me, _, seed = Math.floor(Math.random() * 2 ** 31)) {
    db.offers ||= {}
    return db.offers[me] ||= drawOffers(db.characters, seeded(seed))
  },
  // the favourite character, plus one of the offered choices for every other type
  squad_create(db, me, { p_favourite, p_picks, p_anime }) {
    if (db.squads.some(s => s.user_id === me)) fail('You already have a squad')
    const favourite = character(db, p_favourite)
    const offers = db.offers?.[me] || fail('See your choices first')
    const picks = (p_picks || []).map(id => character(db, id))
    const types = POWER_TYPES.filter(t => t !== favourite.power_type)
    if (picks.length !== types.length || !types.every(t => picks.some(c => c.power_type === t && offers[t].includes(c.character_id)))) fail('Pick one of the choices for each type')
    const anime = db.characters.some(c => c.anime_title === p_anime) ? p_anime : null
    addSquad(db, me, [favourite, ...picks], anime)
  },
  // bring another card of the same type into a slot; the one that leaves keeps its rank
  squad_swap(db, me, { p_slot, p_card }) {
    squadOf(db, me)
    const out = lineOf(db, me).find(c => c.slot === p_slot) || fail('No such slot')
    const next = cardOf(db, me, p_card)
    if (next.slot) fail('Already in your squad')
    if (typeOf(db, next) !== typeOf(db, out)) fail('Your squad takes one card of each type')
    out.slot = null
    next.slot = p_slot
  },
  // spend upgrade points on a card: three stat points each time, and enough upgrades raise its rank.
  // Points the card got from used-up cards go first.
  squad_upgrade(db, me, { p_card }) {
    const squad = squadOf(db, me), card = cardOf(db, me, p_card)
    const cost = upgradeCost(card.upgrades) ?? fail('Already at the top rank')
    const own = card.fed || 0, need = Math.max(0, cost - own)
    if (squad.pool < need) fail(`This upgrade costs ${cost}. Win ranked battles to earn upgrade points.`)
    squad.pool -= need
    card.fed = Math.max(0, own - cost)
    card.upgrades++
    card.points += POINTS_PER_UPGRADE
  },
  // use up a spare card to upgrade another; it can't be undone
  squad_feed(db, me, { p_card, p_use }) {
    const card = cardOf(db, me, p_card), used = cardOf(db, me, p_use)
    if (card === used) fail('Pick a different card')
    if (used.slot) fail("Cards in your squad can't be used up")
    if (used.locked) fail('That card is locked')
    if (pointsToTop(card.upgrades) <= (card.fed || 0)) fail('This card needs no more points')
    card.fed = (card.fed || 0) + feedValue(used, used.character_id === card.character_id) + (used.fed || 0)
    db.cardSeq = Math.max(db.cardSeq || 0, used.card_id)
    db.fighters = db.fighters.filter(c => c !== used)
  },
  squad_lock(db, me, { p_card }) {
    const card = cardOf(db, me, p_card)
    card.locked = !card.locked
  },
  squad_trait(db, me, { p_card, p_trait }) {
    const card = cardOf(db, me, p_card)
    if (!traitPending(card)) fail('No trait to choose yet')
    if (!TRAITS[p_trait] || !traitChoices(card).includes(p_trait)) fail('Pick one of the three choices')
    card.traits = [...(card.traits || []), p_trait]
  },
  // place every unspent point, one stat at a time, the card's strongest first
  squad_spread(db, me, { p_card }) {
    const card = cardOf(db, me, p_card)
    if (card.points < 1) fail('No points to spend')
    const order = [...STATS].sort((a, b) => card.stats[b] - card.stats[a])
    const stats = { ...card.stats }
    for (let placed = true; card.points && placed;) {
      placed = false
      for (const stat of order) if (card.points && stats[stat] < statCap(card.upgrades)) { stats[stat]++; card.points--; placed = true }
    }
    card.stats = stats
  },
  squad_move_up(db, me, { p_slot }) {
    const line = lineOf(db, me)
    const mover = line.find(f => f.slot === p_slot), above = line.find(f => f.slot === p_slot - 1)
    if (!mover || !above) return
    mover.slot = p_slot - 1
    above.slot = p_slot
  },
  squad_tactic(db, me, { p_tactic }) {
    if (!TACTICS.some(t => t.id === p_tactic)) fail('No such tactic')
    squadOf(db, me).tactic = p_tactic
  },
  squad_allocate(db, me, { p_card, p_stat }) {
    const card = cardOf(db, me, p_card)
    if (!STATS.includes(p_stat)) fail('No such stat')
    if (card.points < 1) fail('No points to spend')
    if (card.stats[p_stat] >= statCap(card.upgrades)) fail('At the limit for this card. Upgrade it to go higher.')
    card.stats = { ...card.stats, [p_stat]: card.stats[p_stat] + 1 }
    card.points--
  },
  // a ranked battle goes on the challenger's record and counts against today; winning earns an upgrade point,
  // once per rival per day. A spar evens both sides and does none of that.
  squad_battle(db, me, { p_opponent, p_ranked }, seed = Math.floor(Math.random() * 2 ** 31), day = today()) {
    if (p_opponent === me) fail("You can't fight yourself")
    const mine = squadOf(db, me)
    const theirs = db.squads.find(s => s.user_id === p_opponent) || fail("They haven't picked a squad yet")
    freshDay(mine, day)
    if (p_ranked && fightsLeft(mine, day) < 1) fail('No ranked battles left today. Spar instead.')
    if (p_ranked && !inReach(lineOf(db, me), lineOf(db, p_opponent))) fail('Ranked battles are against squads within one rank of yours. Spar instead.')
    const [a, b] = [mine, theirs].map(squad => teamOf(db, squad.user_id, { evenOut: !p_ranked }))
    const { winner, events } = simulate(a, b, seed)
    const result = { ranked: !!p_ranked, winner, events, a, b, earned: 0, points: 0 }
    if (p_ranked) {
      if (winner === 'a' && !mine.foes[p_opponent]) {
        result.earned = 1
        mine.pool++
        mine.foes = { ...mine.foes, [p_opponent]: 1 }
        const rank = db.user_ranks?.find(x => x.user_id === me)
        if (rank) { addPoints(rank, WIN_POINTS); result.points = WIN_POINTS }
      }
      mine.fights++
      db.duels.push({
        id: db.duels.length + 1, challenger_id: me, opponent_id: p_opponent, winner_id: winner === 'a' ? me : p_opponent,
        week: weekOf(new Date(day)), created_at: new Date().toISOString(),
      })
    }
    result.fightsLeft = fightsLeft(mine, day)
    return result
  },
  // one more ranked battle, today only
  squad_buy_battle(db, me, _, day = today(), week = weekOf()) {
    const squad = squadOf(db, me)
    freshDay(squad, day)
    if (squad.week !== week) Object.assign(squad, { week, extras: 0 })
    if (squad.extras >= EXTRA_PER_WEEK) fail(`Only ${EXTRA_PER_WEEK} extra battles a week`)
    spend(db, me, PRICES.extra)
    squad.extras++
    squad.bonus = (squad.bonus || 0) + 1
  },
  // one surprise a day and a bundle a week
  reward_claim(db, me, { p_when }, seed = roll(), day = today(), week = weekOf()) {
    const squad = squadOf(db, me), r = seeded(seed)
    const find = (floor) => {
      const found = drawFind(db.characters, r, floor)
      return { card_id: addCard(db, me, newCard(character(db, found.character_id), found.rank)), ...found }
    }
    if (p_when === 'weekly') {
      if (squad.claimed_week === week) fail('Come back next week')
      squad.claimed_week = week
      squad.gifts = (squad.gifts || 0) + WEEKLY_REWARD.coins
      squad.pool += WEEKLY_REWARD.points
      return { coins: WEEKLY_REWARD.coins, points: WEEKLY_REWARD.points, card: find(WEEKLY_REWARD.floor) }
    }
    if (p_when !== 'daily') fail('No such reward')
    if (squad.claimed_day === day) fail('Come back tomorrow')
    squad.claimed_day = day
    const { kind, amount } = drawDaily(r)
    if (kind === 'coins') squad.gifts = (squad.gifts || 0) + amount
    if (kind === 'points') squad.pool += amount
    if (kind === 'battle') { freshDay(squad, day); squad.bonus = (squad.bonus || 0) + amount }
    return kind === 'card' ? { card: find(0) } : { [kind]: amount }
  },
  // today's six cards: drawn once and kept, so asking again never rerolls them
  market_stock(db, me, _, seed = roll(), day = today()) {
    squadOf(db, me)
    db.markets ||= {}
    if (db.markets[me]?.day !== day) db.markets[me] = { day, items: drawMarket(db.characters, seeded(seed)).map((item, slot) => ({ ...item, slot, sold: false })) }
    return db.markets[me]
  },
  market_buy(db, me, { p_slot }, day = today()) {
    const stock = db.markets?.[me]
    if (stock?.day !== day) fail('The market has new cards. Look again.')
    const item = stock.items[p_slot] || fail('No such card')
    if (item.sold) fail('Already bought')
    if (!marketOpen(item.rank, db.user_ranks.find(r => r.user_id === me)?.season_points)) fail(`Reach ${RANK_GATES[item.rank]} to buy rank ${CARD_RANKS[item.rank]} cards`)
    spend(db, me, item.price)
    item.sold = true
    return addCard(db, me, newCard(character(db, item.character_id), item.rank))
  },
  // take every placed point back; the card keeps its rank
  squad_reset(db, me, { p_card }) {
    const card = cardOf(db, me, p_card)
    const earned = card.upgrades * POINTS_PER_UPGRADE
    if (card.points >= earned) fail('No placed points to take back')
    spend(db, me, PRICES.reset)
    card.stats = startingStats(character(db, card.character_id))
    card.points = earned
  },
  // my battle party against another guild's: squads pair off strongest first, and an unmatched squad wins its bout.
  // Any member of the party may call it, once a week for each pair of guilds.
  guild_war(db, me, { p_party }, seed = Math.floor(Math.random() * 2 ** 31), week = weekOf()) {
    squadOf(db, me)
    const seat = db.guild_party_members.find(m => m.user_id === me && m.occasion === 'battle') || fail('Join a battle party first')
    const mine = db.guild_parties.find(p => p.id === seat.party_id)
    const theirs = db.guild_parties.find(p => p.id === p_party && p.occasion === 'battle') || fail('That party no longer exists')
    if (theirs.guild_id === mine.guild_id) fail('That party is in your guild')
    const pair = [mine.guild_id, theirs.guild_id]
    if (db.wars.some(w => w.week === week && pair.includes(w.guild_id) && pair.includes(w.opponent_id))) fail('Your guilds already fought this week')
    const [a, b] = [mine, theirs].map(party => crewOf(db, party))
    if (!b.length) fail('Nobody in that party has a squad yet')
    const bouts = clash(db, a, b, seed)
    const score = winsOf(bouts, 'a'), against = winsOf(bouts, 'b')
    const war = {
      id: db.wars.length + 1, week, guild_id: mine.guild_id, opponent_id: theirs.guild_id, bouts, score, against,
      winner_id: score > against ? mine.guild_id : against > score ? theirs.guild_id : null,
    }
    db.wars.push(war)
    return war
  },
  // this week's knockout between every tournament party that has a squad. A member of one of them starts it.
  // shortcut: started by a player here; with real accounts a scheduled job runs it at a set time
  cup_play(db, me, _, seed = Math.floor(Math.random() * 2 ** 31), week = weekOf()) {
    squadOf(db, me)
    if (!db.guild_party_members.some(m => m.user_id === me && m.occasion === 'tournament')) fail('Join a tournament party first')
    if (db.cups.some(c => c.week === week)) fail("This week's cup has been played")
    const limit = CUP_RANKS[db.cups.length % CUP_RANKS.length]
    const entrants = db.guild_parties.filter(p => p.occasion === 'tournament').map(p => {
      const crew = crewOf(db, p, limit)
      return {
        party_id: p.id, name: p.name, guild_id: p.guild_id, tag: db.guilds.find(g => g.id === p.guild_id)?.tag, crew,
        strength: crew.reduce((n, id) => n + squadStrength(lineOf(db, id).map(c => capped(c, limit))), 0),
      }
    }).filter(e => e.crew.length).sort((a, b) => b.strength - a.strength || a.party_id - b.party_id)
      .map((e, i) => ({ ...e, seed: i }))
    if (entrants.length < 2) fail('A cup needs two parties with squads')
    let field = bracket(entrants.length).map(n => entrants[n] || null)
    const rounds = []
    while (field.length > 1) {
      const matches = [], through = []
      for (let i = 0; i < field.length; i += 2) {
        const [a, b] = [field[i], field[i + 1]]
        if (!a || !b) { through.push(a || b); continue }
        const m = match(db, a, b, seed + rounds.length * 100 + i * 10, limit)
        matches.push(m)
        through.push(m.winner === 'a' ? a : b)
      }
      rounds.push(matches)
      field = through
    }
    const { party_id, name, tag, guild_id, crew } = field[0]
    // members who fielded a squad earn the champion badge, and keep it if they later leave the party
    const cup = { id: db.cups.length + 1, week, limit, entrants: entrants.length, rounds, champion: { party_id, name, tag, guild_id, members: crew } }
    db.cups.push(cup)
    return cup
  },
  // demo only: close this week's cup so the next one, with the next rank limit, can be played
  cup_next(db, me, _, week = weekOf()) {
    for (const c of db.cups) if (c.week === week) c.week = `${week} #${c.id}`
  },
  // demo only: skip to tomorrow so the daily limit doesn't get in the way of trying things
  squad_new_day(db, me) {
    Object.assign(squadOf(db, me), { day: null, fights: 0, bonus: 0, foes: {}, claimed_day: null })
    delete db.markets?.[me]
  },
  // demo only: open the weekly reward and extra battles again
  squad_new_week(db, me) { Object.assign(squadOf(db, me), { claimed_week: null, week: null, extras: 0 }) },
}

// rival squads for the demo: popular characters, spread across the ranks, points spent at random
export function seedSquads(db, userIds, seed = 11) {
  const r = seeded(seed)
  userIds.forEach((userId, n) => {
    const picks = POWER_TYPES.map(type => {
      const famous = db.characters.filter(c => c.power_type === type).sort((a, b) => b.favourites - a.favourites).slice(0, 10)
      return famous[Math.floor(r() * famous.length)]
    }).sort(() => r() - 0.5)
    addSquad(db, userId, picks)
    squadOf(db, userId).tactic = TACTICS[Math.floor(r() * TACTICS.length)].id
    const upgrades = RANK_START[n % CARD_RANKS.length]
    for (const card of lineOf(db, userId)) {
      card.upgrades = upgrades
      while (traitPending(card)) card.traits = [...card.traits, traitChoices(card)[Math.floor(r() * 3)]]
      for (let p = upgrades * POINTS_PER_UPGRADE; p > 0;) {
        const stat = STATS[Math.floor(r() * STATS.length)]
        if (card.stats[stat] < statCap(upgrades)) { card.stats[stat]++; p-- }
      }
    }
  })
}
