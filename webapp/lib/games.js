// Every game on the Gyokan platform. `slug` games run on the shared engine in public/games/engine.js.
export const GAMES = [
  {
    slug: 'hangumanu',
    title: 'Hangu-Manu',
    tag: 'Solo',
    emoji: '🔤',
    blurb: 'Anime hangman. Pick a category and guess the hidden word before six wrong letters.',
  },
  {
    slug: 'anime-imposter',
    title: 'Anime Imposter',
    tag: 'Party · 3+ players',
    emoji: '🥷',
    blurb: 'Pass the phone. Everyone sees the secret word except the imposter. Find them.',
  },
  {
    slug: 'anime-charades',
    title: 'Anime Charades',
    tag: 'Party · 2+ players',
    emoji: '🎭',
    blurb: 'Act out anime characters against the clock while your friends guess.',
  },
  {
    slug: 'tic-tac-toe-game',
    title: 'Category Tic Tac Toe',
    tag: '2 players',
    emoji: '⭕',
    blurb: 'Tic tac toe with a twist: claim a square by naming something that fits its row and column.',
  },
]

export const gameBySlug = (slug) => GAMES.find(g => g.slug === slug)
