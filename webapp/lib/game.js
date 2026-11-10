// Game rules shared by the pages. The battle job (pipeline/battle.py) uses the same numbers: keep them in sync.

export const BUDGET = 100000000

export const SLOT_DEFS = [
  { type: 'Champion', count: 2, points: 5, color: 'text-amber-400', border: 'border-amber-500/30 bg-amber-500/5', empty: 'border-amber-500/20' },
  { type: 'Specialist', count: 3, points: 4, color: 'text-purple-400', border: 'border-purple-500/30 bg-purple-500/5', empty: 'border-purple-500/20' },
  { type: 'Support', count: 2, points: 3, color: 'text-blue-400', border: 'border-blue-500/30 bg-blue-500/5', empty: 'border-blue-500/20' },
  { type: 'Medic', count: 1, points: 3, color: 'text-green-400', border: 'border-green-500/30 bg-green-500/5', empty: 'border-green-500/20' },
  { type: 'Sub', count: 2, points: 1, color: 'text-zinc-400', border: 'border-zinc-700/30 bg-zinc-800/30', empty: 'border-zinc-700/30' },
]

export const SLOT_COLORS = Object.fromEntries(SLOT_DEFS.map(d => [d.type, d.color]))

export const DRAW_POINTS = 1
export const MEDIC_BOOST = 1.5

export const POWER_TYPES = ['Physical', 'Tactical', 'Cursed', 'Spiritual', 'Elemental', 'Mythic']
// each type beats the next one in the circle
export const BEATS = Object.fromEntries(POWER_TYPES.map((t, i) => [t, POWER_TYPES[(i + 1) % POWER_TYPES.length]]))

export const POWER_COLORS = {
  Physical: 'text-orange-400',
  Elemental: 'text-blue-400',
  Spiritual: 'text-purple-400',
  Tactical: 'text-yellow-400',
  Cursed: 'text-red-400',
  Mythic: 'text-pink-400',
}

export const POWER_BADGES = {
  Physical: 'bg-orange-500/20 text-orange-400',
  Elemental: 'bg-blue-500/20 text-blue-400',
  Spiritual: 'bg-purple-500/20 text-purple-400',
  Tactical: 'bg-yellow-500/20 text-yellow-400',
  Cursed: 'bg-red-500/20 text-red-400',
  Mythic: 'bg-pink-500/20 text-pink-400',
}

// season points needed, lowest first
export const RANKS = [
  { name: 'Rookie', min: 0, color: 'text-zinc-500', bg: 'border-zinc-700/30 bg-zinc-900/50' },
  { name: 'Ronin', min: 40, color: 'text-zinc-400', bg: 'border-zinc-600/30 bg-zinc-800/30' },
  { name: 'Veteran', min: 110, color: 'text-blue-400', bg: 'border-blue-500/30 bg-blue-500/5' },
  { name: 'Warlord', min: 220, color: 'text-red-400', bg: 'border-red-500/30 bg-red-500/5' },
  { name: 'Sovereign', min: 350, color: 'text-purple-400', bg: 'border-purple-500/30 bg-purple-500/5' },
  { name: 'Legendary', min: 500, color: 'text-amber-400', bg: 'border-amber-500/30 bg-amber-500/5' },
]

export const rankInfo = (name) => RANKS.find(r => r.name === name) || RANKS[0]

export const nextRank = (points) => RANKS.find(r => r.min > points) || null

export const STATS = ['strength', 'speed', 'defence', 'technique', 'magic', 'iq', 'aura']

export const formatGold = (g) => (g || g === 0) ? `${Math.round(g / 1000000)}M` : '—'

export const formatPoints = (p) => Math.round(Number(p || 0) * 10) / 10

// Thursday 19:00 UTC, matching .github/workflows/battles.yml
export const nextBattle = (now = new Date()) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 19))
  d.setUTCDate(d.getUTCDate() + ((4 - d.getUTCDay() + 7) % 7))
  if (d <= now) d.setUTCDate(d.getUTCDate() + 7)
  return d
}
