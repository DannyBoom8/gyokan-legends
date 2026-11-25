// Demo mode: a stand-in for the Supabase client that keeps a small game world in this browser.
// It answers the same query calls the pages make, so every page works without the backend.
// Fight and scoring rules mirror pipeline/battle.py; keep them in sync.
import { BUDGET, SLOT_DEFS, DRAW_POINTS, MEDIC_BOOST, addPoints } from './game.js'
import { RPC, fight, leaderboardRows, guildRows } from './guild-rules.js'
import { SQUAD_RPC, seedSquads } from './squad-rules.js'
import { inReach } from './squad.js'

const FLAG = 'gyokan-demo'
const STORE = 'gyokan-demo-db-v9' // bump when the demo tables change
const ME = 'demo-player'
const SLOT_POINTS = Object.fromEntries(SLOT_DEFS.map(d => [d.type, d.points]))
const BOTS = ['TitanSlayer', 'MangaMage', 'NarutoFan', 'SoloLevelUp', 'HunterX', 'NewbieSan', 'CursedQueen', 'OnePieceGuy', 'ShinobiKai', 'AuraFarmer', 'PlusUltra']
const PK = { characters: 'character_id', users: 'id', user_ranks: 'user_id', parties: 'id', party_slots: 'id', gameweeks: 'gameweek_id', fixtures: 'fixture_id', results: 'result_id', fantasy_points: 'points_id', seasons: 'season_id' }

// bots by index into BOTS; the demo player starts in the first guild. NewbieSan has none.
const GUILDS = [['Lagos Shinobi', 'LSN', [0, 1, 2, 4]], ['Abuja Titans', 'ABJ', [3, 6, 7, 8]], ['Port Harcourt Crew', 'PHC', [9, 10]]]

const storage = () => { try { return window.localStorage } catch { return null } }
export const isDemo = () => typeof window !== 'undefined' && storage()?.getItem(FLAG) === '1'
export const startDemo = () => { storage()?.setItem(FLAG, '1'); window.location.href = '/squad' }
export const exitDemo = () => { const s = storage(); s?.removeItem(FLAG); s?.removeItem(STORE); window.location.href = '/' }

// small seeded RNG so a fresh demo always looks the same
function rng(seed) {
  let s = seed >>> 0
  const next = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  next.gauss = () => Math.sqrt(-2 * Math.log(next() || 1e-9)) * Math.cos(2 * Math.PI * next())
  return next
}

// a random legal party: each slot gets a random character the remaining budget allows
function randomParty(chars, r) {
  const pool = [...chars].sort(() => r() - 0.5), picks = []
  let left = BUDGET, need = SLOT_DEFS.reduce((n, d) => n + d.count, 0)
  for (const def of SLOT_DEFS) for (let p = 1; p <= def.count; p++) {
    need--
    const reserve = need * 5000000 // keep enough for the cheapest picks still to come
    const c = pool.find(c => c.gold_cost <= left - reserve && !picks.some(x => x.character_id === c.character_id))
    if (!c) continue
    left -= c.gold_cost
    picks.push({ character_id: c.character_id, slot_type: def.type, slot_position: p })
  }
  return picks
}

function seed(chars) {
  const r = rng(7)
  const db = { characters: chars.map(c => ({ ...c, is_active: true })), users: [], user_ranks: [], parties: [], party_slots: [], seasons: [{ season_id: 1, name: 'Season 1', is_active: true }], gameweeks: [], fixtures: [], results: [], fantasy_points: [], guilds: [], guild_members: [], guild_parties: [], guild_party_members: [], nakama: [], duels: [], squads: [], fighters: [], wars: [], cups: [], seq: {} }
  for (const [id, username] of [[ME, 'DemoPlayer'], ...BOTS.map((b, i) => [`bot-${i}`, b])]) {
    db.users.push({ id, username, country_code: 'NG' })
    db.user_ranks.push({ user_id: id, current_rank: 'Rookie', season_points: 0, all_time_points: 0, is_legend: false })
    const party = insertRow(db, 'parties', { user_id: id })
    for (const s of randomParty(db.characters, r)) insertRow(db, 'party_slots', { ...s, party_id: party.id, gameweek: null })
  }
  for (let w = 0; w < 3; w++) battleNight(db, r)
  // the bots have been at it longer, so they sit all the way up the ladder
  BOTS.forEach((_, i) => addPoints(db.user_ranks.find(x => x.user_id === `bot-${i}`), i * i * 30))
  seedSocial(db)
  const bots = BOTS.map((_, i) => `bot-${i}`)
  seedSquads(db, bots) // the demo player picks their own
  // some older fights between the bots, so records aren't all zero
  const line = (id) => db.fighters.filter(f => f.user_id === id)
  bots.forEach((bot, i) => bots.filter(them => them !== bot && inReach(line(bot), line(them))).slice(0, 2)
    .forEach((them, n) => SQUAD_RPC.squad_battle(db, bot, { p_opponent: them, p_ranked: true }, i * 10 + n, '2000-01-03')))
  return db
}

function seedSocial(db) {
  for (const [name, tag, members] of GUILDS) {
    const [leader, ...rest] = members.map(i => `bot-${i}`)
    const id = RPC.create_guild(db, leader, { p_name: name, p_tag: tag })
    for (const who of tag === 'LSN' ? [...rest, ME] : rest) RPC.join_guild(db, who, { p_guild: id })
  }
  const raid = RPC.create_party(db, 'bot-0', { p_name: 'Thursday Raiders', p_occasion: 'battle' })
  RPC.join_party(db, 'bot-1', { p_party: raid })
  // rival battle parties, so there is someone to go to war with
  const parties = [
    ['battle', 'Capital Vanguard', 'bot-3', 'bot-6', 'bot-7'], ['battle', 'Harbour Blades', 'bot-9', 'bot-10'],
    // and a field for the cup; the first is in the demo player's guild, with room to join
    ['tournament', 'Leaf Contenders', 'bot-2', 'bot-4'], ['tournament', 'Rock Garden', 'bot-3', 'bot-6'],
    ['tournament', 'Abuja Prime', 'bot-7', 'bot-8'], ['tournament', 'Tide Breakers', 'bot-9', 'bot-10'],
  ]
  for (const [occasion, name, captain, ...crew] of parties) {
    const party = RPC.create_party(db, captain, { p_name: name, p_occasion: occasion })
    for (const who of crew) RPC.join_party(db, who, { p_party: party })
  }
  db.nakama.push({ user_id: ME, nakama_id: 'bot-1' }, { user_id: ME, nakama_id: 'bot-7' })
}

function insertRow(db, table, row) {
  const key = PK[table]
  if (key && row[key] == null) { db.seq[table] = (db.seq[table] || 0) + 1; row = { ...row, [key]: db.seq[table] } }
  db[table].push(row)
  return row
}

// one Thursday: pair everyone up, fight, score every party (same as pipeline/battle.py)
export function battleNight(db, r = rng(Date.now())) {
  const gw = insertRow(db, 'gameweeks', { season_id: 1, gameweek_number: db.gameweeks.length + 1, battle_date: new Date().toISOString().slice(0, 10), is_completed: true })
  const ids = db.characters.map(c => c.character_id).sort(() => r() - 0.5)
  const byId = Object.fromEntries(db.characters.map(c => [c.character_id, c]))
  const outcome = {}
  for (let i = 0; i + 1 < ids.length; i += 2) {
    const [a, b] = [ids[i], ids[i + 1]]
    const fx = insertRow(db, 'fixtures', { gameweek_id: gw.gameweek_id, character_a_id: a, character_b_id: b })
    const win = fight(byId[a], byId[b], r)
    if (win == null) outcome[a] = outcome[b] = 'draw'
    else { outcome[win] = 'win'; outcome[win === a ? b : a] = 'loss' }
    insertRow(db, 'results', { fixture_id: fx.fixture_id, winner_id: win, loser_id: win == null ? null : win === a ? b : a, was_draw: win == null })
  }
  for (const party of db.parties) {
    const slots = db.party_slots.filter(s => s.party_id === party.id)
    const medicWon = slots.some(s => s.slot_type === 'Medic' && outcome[s.character_id] === 'win')
    let total = 0
    for (const s of slots) {
      const o = outcome[s.character_id]
      const base = o === 'win' ? SLOT_POINTS[s.slot_type] : o === 'draw' ? DRAW_POINTS : 0
      const boosted = medicWon && o === 'win' && s.slot_type !== 'Medic'
      const final = boosted ? Math.round(base * MEDIC_BOOST * 10) / 10 : base
      total += final
      insertRow(db, 'fantasy_points', { user_id: party.user_id, gameweek_id: gw.gameweek_id, character_id: s.character_id, slot_type: s.slot_type, base_points: base, medic_boost_applied: boosted, final_points: final })
    }
    const rank = db.user_ranks.find(x => x.user_id === party.user_id)
    addPoints(rank, total)
  }
  return gw
}

let dbPromise
function loadDb() {
  if (!dbPromise) dbPromise = (async () => {
    try { const saved = storage()?.getItem(STORE); if (saved) return JSON.parse(saved) } catch {}
    const chars = await fetch('/demo/characters.json').then(r => r.json())
    const db = seed(chars)
    save(db)
    return db
  })()
  return dbPromise
}
const save = (db) => { try { storage()?.setItem(STORE, JSON.stringify(db)) } catch {} }
export const runDemoBattle = async () => { const db = await loadDb(); battleNight(db); save(db) }

// --- query builder: only the PostgREST features the pages use
const same = (a, b) => String(a) === String(b)
const splitTop = (s) => s.split(/,(?![^(]*\))/).map(x => x.trim()).filter(Boolean)
function matchCond(row, cond) {
  const [col, op, ...rest] = cond.split('.'), val = rest.join('.')
  if (op === 'eq') return same(row[col], val)
  if (op === 'in') return val.replace(/[()]/g, '').split(',').some(v => same(row[col], v))
  return false
}

function embed(db, table, row, select) {
  const out = { ...row }
  for (const [, alias, name] of select.matchAll(/(?:(\w+):)?(\w+)\(/g)) {
    if (alias) out[alias] = db.characters.find(c => same(c.character_id, row[name])) || null
    else if (name === 'characters') out.characters = db.characters.find(c => same(c.character_id, row.character_id)) || null
    else if (name === 'results') out.results = db.results.filter(x => same(x.fixture_id, row.fixture_id))
    else if (name === 'gameweeks') out.gameweeks = db.gameweeks.find(g => same(g.gameweek_id, row.gameweek_id)) || null
  }
  return out
}

function tableRows(db, table) {
  if (table === 'leaderboard') return leaderboardRows(db)
  if (table === 'guild_leaderboard') return guildRows(db)
  return db[table] || []
}

function query(table) {
  const filters = [], q = { mode: 'select', select: '*', order: null, from: 0, to: Infinity, one: null, values: null }
  const b = {
    select(cols = '*') { q.select = cols; q.returning = true; return b },
    eq(col, v) { filters.push(r => same(r[col], v)); return b },
    in(col, values) { filters.push(r => values.some(v => same(r[col], v))); return b },
    or(expr) { const conds = splitTop(expr); filters.push(r => conds.some(c => matchCond(r, c))); return b },
    ilike(col, pat) { const needle = pat.replace(/%/g, '').toLowerCase(); filters.push(r => String(r[col] ?? '').toLowerCase().includes(needle)); return b },
    order(col, { ascending = true } = {}) { q.order = [col, ascending]; return b },
    limit(n) { q.to = q.from + n - 1; return b },
    range(a, z) { q.from = a; q.to = z; return b },
    single() { q.one = 'single'; return b },
    maybeSingle() { q.one = 'maybe'; return b },
    insert(values) { q.mode = 'insert'; q.values = Array.isArray(values) ? values : [values]; return b },
    delete() { q.mode = 'delete'; return b },
    update(values) { q.mode = 'update'; q.values = values; return b },
    then(resolve, reject) { return run().then(resolve, reject) },
  }
  async function run() {
    const db = await loadDb()
    if (q.mode === 'insert') {
      const added = []
      for (const v of q.values) {
        if (table === 'party_slots' && db.party_slots.some(s => same(s.party_id, v.party_id) && (same(s.character_id, v.character_id) || (s.slot_type === v.slot_type && same(s.slot_position, v.slot_position)))))
          return { data: null, error: { message: 'That character or slot is already in your lineup' } }
        if (table === 'nakama' && db.nakama.some(n => same(n.user_id, v.user_id) && same(n.nakama_id, v.nakama_id)))
          return { data: null, error: { message: 'Already your nakama' } }
        added.push(insertRow(db, table, { ...v }))
      }
      save(db)
      const data = q.returning ? added : null
      return { data: q.one && data ? data[0] : data, error: null }
    }
    let rows = tableRows(db, table).filter(r => filters.every(f => f(r)))
    if (q.mode === 'update') {
      rows.forEach(r => Object.assign(r, q.values)); save(db)
      return { data: null, error: null }
    }
    if (q.mode === 'delete') {
      db[table] = db[table].filter(r => !rows.includes(r)); save(db)
      return { data: null, error: null }
    }
    if (q.order) { const [c, asc] = q.order; rows = [...rows].sort((a, z) => (a[c] > z[c] ? 1 : a[c] < z[c] ? -1 : 0) * (asc ? 1 : -1)) }
    rows = rows.slice(q.from, q.to + 1).map(r => embed(db, table, r, q.select))
    if (q.one) {
      if (!rows.length) return { data: null, error: q.one === 'single' ? { message: 'No rows' } : null }
      return { data: rows[0], error: null }
    }
    return { data: rows, error: null }
  }
  return b
}

// the database functions the pages call
async function rpc(name, args = {}) {
  const db = await loadDb()
  try {
    const data = (RPC[name] || SQUAD_RPC[name])(db, ME, args)
    save(db)
    return { data: data ?? null, error: null }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  }
}

export function createDemoClient() {
  const session = { user: { id: ME, email: 'demo@gyokan.gg' } }
  return {
    from: query,
    rpc,
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      signOut: async () => { exitDemo(); return { error: null } },
      signInWithPassword: async () => ({ data: { session }, error: null }),
      signUp: async () => ({ data: { user: session.user }, error: null }),
    },
  }
}
