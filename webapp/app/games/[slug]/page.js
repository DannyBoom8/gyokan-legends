import GamePage from '../../../components/GamePage'
import { GAMES, gameBySlug } from '../../../lib/games'

// one static page per game at build time (the site is a static export)
export const dynamicParams = false
export const generateStaticParams = () => GAMES.map(g => ({ slug: g.slug }))

export async function generateMetadata({ params }) {
  const game = gameBySlug((await params).slug)
  return {
    title: `${game.title} · Gyokan Legends`,
    description: game.blurb,
    // child openGraph replaces the parent's whole object, so repeat the image
    openGraph: { title: `${game.title} · Gyokan Legends`, description: game.blurb, url: `/games/${game.slug}`, images: [{ url: '/og.png?v=3', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: `${game.title} · Gyokan Legends`, description: game.blurb, images: ['/og.png?v=3'] },
  }
}

export default async function Page({ params }) {
  return <GamePage game={gameBySlug((await params).slug)} />
}
