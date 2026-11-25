// What a player may do with their squad, run against the demo database. When real accounts come back these
// become database or Worker functions: the server must decide every fight, never the browser.
import { STATS } from './game.js'
import { weekOf } from './guild-rules.js'
import { CUP_LIMITS, EXTRA_PER_WEEK, MAX_LEVEL, POINTS_PER_LEVEL, PRICES, SQUAD_SIZE, TACTICS, bracket, capped, creditsOf, evened, fightsLeft, gainXp, newFighter, seeded, simulate, squadLevel, startingStats, statCap, xpFor } from './squad.js'

const fail = (message) => { throw new Error(message) }
const today = (now = new Date()) => now.toISOString().slice(0, 10)
const owned = (db, userId) => db.fighters.filter(f => f.user_id === userId)
const lineOf = (db, userId) => owned(db, userId).filter(f => f.slot).sort((a, b) => a.slot - b.slot)
const character = (db, id) => db.characters.find(c => c.character_id === id) || fail('No such character')

function squadOf(db, userId) {
  return db.squads.find(s => s.user_id === userId) || fail('Pick your three fighters first')
}

// the day's fight count starts over at midnight UTC
function freshDay(squad, day) {
  if (squad.day !== day) Object.assign(squad, { day, fights: 0, bonus: 0, foes: {} })
}

// one squad as the engine wants it; spars shrink both sides to the same size, cups apply their level limit
const teamOf = (db, userId, { evenOut = false, limit = MAX_LEVEL } = {}) => ({
  tactic: squadOf(db, userId).tactic,
  fighters: lineOf(db, userId).map(f => capped(f, limit)).map(f => ({
    character_id: f.character_id, level: f.level, power_type: character(db, f.character_id).power_type,
    stats: evenOut ? evened(f.stats) : { ...f.stats },
  })),
})

// a party's members who have a squad, strongest first
const crewOf = (db, party, limit = MAX_LEVEL) => {
  const level = (id) => squadLevel(lineOf(db, id).map(f => capped(f, limit)))
  return db.guild_party_members.filter(m => m.party_id === party.id)
    .map(m => m.user_id).filter(id => db.squads.some(s => s.user_id === id))
    .sort((x, y) => level(y) - level(x))
}

// party against party: squads pair off in order, and an unmatched squad wins its bout
const clash = (db, a, b, seed, limit) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => {
  if (!a[i] || !b[i]) return { a: a[i] || null, b: b[i] || null, winner: a[i] ? 'a' : 'b', battle: null }
  const [x, y] = [teamOf(db, a[i], { limit }), teamOf(db, b[i], { limit })]
  const { winner, events } = simulate(x, y, seed + i)
  return { a: a[i], b: b[i], winner, battle: { winner, events, a: x, b: y, xp: 0, levelUps: [] } }
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
  if (creditsOf(points, squad) < price) fail('Not enough credits. Your lineup earns them on battle night.')
  squad.spent = (squad.spent || 0) + price
}

export const SQUAD_RPC = {
  squad_create(db, me, { p_characters }) {
    if (db.squads.some(s => s.user_id === me)) fail('You already have a squad')
    const ids = [...new Set(p_characters || [])]
    if (ids.length !== SQUAD_SIZE) fail(`Pick ${SQUAD_SIZE} different fighters`)
    const picked = ids.map(id => newFighter(character(db, id)))
    db.squads.push({ user_id: me, tactic: 'attack', day: null, fights: 0, bonus: 0, foes: {}, spent: 0, week: null, extras: 0 })
    picked.forEach((f, i) => db.fighters.push({ ...f, user_id: me, slot: i + 1 }))
  },
  // bring a different character into a slot; whoever leaves keeps their levels on the bench
  squad_swap(db, me, { p_slot, p_character }) {
    squadOf(db, me)
    const out = lineOf(db, me).find(f => f.slot === p_slot) || fail('No such slot')
    let next = owned(db, me).find(f => f.character_id === p_character)
    if (next?.slot) fail('Already in your squad')
    if (!next) db.fighters.push(next = { ...newFighter(character(db, p_character)), user_id: me, slot: null })
    out.slot = null
    next.slot = p_slot
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
  squad_allocate(db, me, { p_character, p_stat }) {
    const f = owned(db, me).find(f => f.character_id === p_character) || fail('Not your fighter')
    if (!STATS.includes(p_stat)) fail('No such stat')
    if (f.points < 1) fail('No points to spend')
    if (f.stats[p_stat] >= statCap(f.level)) fail('At the limit for this level')
    f.stats = { ...f.stats, [p_stat]: f.stats[p_stat] + 1 }
    f.points--
  },
  // a battle earns XP and counts against today; a spar levels both sides and earns nothing
  squad_battle(db, me, { p_opponent, p_ranked }, seed = Math.floor(Math.random() * 2 ** 31), day = today()) {
    if (p_opponent === me) fail("You can't fight yourself")
    const mine = squadOf(db, me), theirs = squadOf(db, p_opponent)
    freshDay(mine, day)
    if (p_ranked && fightsLeft(mine, day) < 1) fail('No XP battles left today. Spar instead.')
    const [a, b] = [mine, theirs].map(squad => teamOf(db, squad.user_id, { evenOut: !p_ranked }))
    const { winner, events } = simulate(a, b, seed)
    const result = { ranked: !!p_ranked, winner, events, a, b, xp: 0, levelUps: [] }
    if (p_ranked) {
      const line = lineOf(db, me)
      const repeats = mine.foes[p_opponent] || 0
      result.xp = xpFor(winner === 'a', squadLevel(line), squadLevel(lineOf(db, p_opponent)), repeats)
      for (const f of line) if (gainXp(f, result.xp)) result.levelUps.push({ character_id: f.character_id, level: f.level })
      mine.fights++
      mine.foes = { ...mine.foes, [p_opponent]: repeats + 1 }
    }
    result.fightsLeft = fightsLeft(mine, day)
    return result
  },
  // one more XP battle, today only
  squad_buy_battle(db, me, _, day = today(), week = weekOf()) {
    const squad = squadOf(db, me)
    freshDay(squad, day)
    if (squad.week !== week) Object.assign(squad, { week, extras: 0 })
    if (squad.extras >= EXTRA_PER_WEEK) fail(`Only ${EXTRA_PER_WEEK} extra battles a week`)
    spend(db, me, PRICES.extra)
    squad.extras++
    squad.bonus = (squad.bonus || 0) + 1
  },
  // take every placed point back; level and XP stay
  squad_reset(db, me, { p_character }) {
    const f = owned(db, me).find(f => f.character_id === p_character) || fail('Not your fighter')
    const earned = (f.level - 1) * POINTS_PER_LEVEL
    if (f.points >= earned) fail('No placed points to take back')
    spend(db, me, PRICES.reset)
    f.stats = startingStats(character(db, p_character))
    f.points = earned
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
    const limit = CUP_LIMITS[db.cups.length % CUP_LIMITS.length]
    const entrants = db.guild_parties.filter(p => p.occasion === 'tournament').map(p => {
      const crew = crewOf(db, p, limit)
      return {
        party_id: p.id, name: p.name, guild_id: p.guild_id, tag: db.guilds.find(g => g.id === p.guild_id)?.tag, crew,
        strength: crew.reduce((n, id) => n + squadLevel(lineOf(db, id).map(f => capped(f, limit))), 0),
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
  // demo only: close this week's cup so the next one, with the next level limit, can be played
  cup_next(db, me, _, week = weekOf()) {
    for (const c of db.cups) if (c.week === week) c.week = `${week} #${c.id}`
  },
  // demo only: skip to tomorrow so the daily limit doesn't get in the way of trying things
  squad_new_day(db, me) { Object.assign(squadOf(db, me), { day: null, fights: 0, bonus: 0, foes: {} }) },
}

// rival squads for the demo: popular characters, different levels, points spent at random
export function seedSquads(db, userIds, seed = 11) {
  const r = seeded(seed)
  const famous = [...db.characters].sort((a, b) => b.favourites - a.favourites).slice(0, 60)
  userIds.forEach((userId, n) => {
    const ids = new Set()
    while (ids.size < SQUAD_SIZE) ids.add(famous[Math.floor(r() * famous.length)].character_id)
    SQUAD_RPC.squad_create(db, userId, { p_characters: [...ids] })
    squadOf(db, userId).tactic = TACTICS[Math.floor(r() * TACTICS.length)].id
    const level = 1 + (n % 6)
    for (const f of lineOf(db, userId)) {
      f.level = level
      for (let p = (level - 1) * 3; p > 0;) {
        const stat = STATS[Math.floor(r() * STATS.length)]
        if (f.stats[stat] < statCap(level)) { f.stats[stat]++; p-- }
      }
    }
  })
}
