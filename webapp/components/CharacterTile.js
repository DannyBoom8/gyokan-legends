// a character to choose: portrait, name and one line under it
export default function CharacterTile({ character, note, chosen, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={chosen} className="hov-thumb w-full text-left">
      <span className={`relative block overflow-hidden border-[3px] ${chosen ? 'border-[var(--spot)]' : 'border-[var(--line)]'}`}>
        <img src={character.image_url} alt="" loading="lazy" className="block w-full aspect-[3/4] object-cover object-top" />
        {chosen && <span className="poster absolute left-0 top-0 bg-[var(--spot)] text-white text-sm px-2 py-1">Chosen</span>}
      </span>
      <span className="text-xs font-semibold line-clamp-2 break-words mt-1">{character.name}</span>
      <span className="label muted block !text-[0.5625rem] mt-0.5 !whitespace-normal">{note}</span>
    </button>
  )
}
