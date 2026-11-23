// Every game on the Gyokan platform. `slug` games run on the shared engine in public/games/engine.js.
export const GAMES = [
  {
    slug: 'hangumanu',
    title: 'Hangu-Manu',
    tag: 'Solo',
    icon: 'letters',
    blurb: 'Anime hangman. Pick a category and guess the hidden word before six wrong letters.',
  },
  {
    slug: 'anime-imposter',
    title: 'Anime Imposter',
    tag: 'Party · 3+ players',
    icon: 'mask',
    blurb: 'Pass the phone. Everyone sees the secret word except the imposter. Find them.',
  },
  {
    slug: 'anime-charades',
    title: 'Anime Charades',
    tag: 'Party · 2+ players',
    icon: 'theater',
    blurb: 'Act out anime characters against the clock while your friends guess.',
  },
]

export const gameBySlug = (slug) => GAMES.find(g => g.slug === slug)
