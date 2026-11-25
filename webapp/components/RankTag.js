import { CARD_RANKS, rankOf } from '../lib/squad'

// a card's rank letter; the colour comes from data-rank (manga.css), and the border of a .rank-frame matches it
export const rankLetter = (upgrades) => CARD_RANKS[rankOf(upgrades)]

export default function RankTag({ upgrades, className = '' }) {
  return <span data-rank={rankLetter(upgrades)} className={`rank-tag poster ${className}`}><span className="sr-only">Rank </span>{rankLetter(upgrades)}</span>
}
