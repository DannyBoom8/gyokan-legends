import { POWER_HEX } from '../lib/game'
import RankTag, { rankLetter } from './RankTag'

// a card's picture: rank colour round it, power type along the top, rank letter in the corner.
// `badge` is what the card is waiting for.
export default function CardArt({ upgrades, character, badge, className = 'relative w-full aspect-[3/4]', tag = 'text-lg', children }) {
  return (
    <span data-rank={rankLetter(upgrades)} className={`rank-frame block ${className}`}>
      <span className="absolute inset-0 overflow-hidden">
        <img src={character?.image_url} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
      </span>
      <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: POWER_HEX[character?.power_type] }} />
      {badge && <span className="label !text-[0.5625rem] absolute right-0 top-1.5 bg-[var(--spot)] !text-[#fff] px-1 py-0.5">{badge}</span>}
      {children}
      <RankTag upgrades={upgrades} className={`absolute right-0 bottom-0 ${tag}`} />
    </span>
  )
}
