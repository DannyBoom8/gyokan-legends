'use client'
import { bracketColumns } from '../lib/squad'

export const roundName = (fromEnd) => ['Final', 'Semi-finals', 'Quarter-finals'][fromEnd] || `Last ${2 ** (fromEnd + 1)}`

// run once when it appears, so picking a match does not move the scroll
const centre = (el) => { if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2 }

// a cup as a tree. From md up it runs left to right; on a phone it runs down and up, one half of the draw
// above and one below, meeting at the final in the middle. The champions' route is drawn in red, beaten
// parties are struck out, and tapping a match picks it (`shown` is "round-place").
export default function Bracket({ cup, shown, onPick }) {
  const columns = bracketColumns(cup.rounds)
  const last = columns.length - 1
  const champion = cup.champion.party_id
  // did the champions come through this slot?
  const route = (slot) => (slot.bye || slot[slot.winner]).party_id === champion
  const line = (hot) => ({ borderColor: hot ? 'var(--spot)' : 'color-mix(in oklab, var(--ink) 35%, transparent)' })
  const feeders = (c, i) => c ? columns[c - 1].slice(i * 2, i * 2 + 2) : []

  const match = (slot, c, i) => {
    const id = `${c}-${i}`
    const final = c === last
    return slot.bye ? (
      <p className="w-full border-2 border-dashed border-current/50 px-2 py-2">
        <span className="poster block text-base break-words">{slot.bye.name}</span>
        <span className="label muted block mt-1 !text-[0.625rem] !whitespace-normal">Bye · through</span>
      </p>
    ) : (
      <button onClick={() => onPick(shown === id ? null : id)} aria-expanded={shown === id}
        className={`box hov-row block w-full text-left ${shown === id ? '!border-[var(--spot)]' : ''}`}>
        {['a', 'b'].map(side => {
          const won = slot.winner === side
          return (
            <span key={side} className={`flex items-center gap-2 px-2 py-1.5 ${won ? 'bg-[var(--spot)] !text-[#fff]' : ''}`}>
              <span className={`flex-1 min-w-0 ${won ? '' : 'opacity-60'}`}>
                <span className={`poster block text-base break-words ${won ? '' : 'line-through decoration-2'}`}>{slot[side].name}</span>
                <span className="label block mt-1 !text-[0.625rem] !whitespace-normal">
                  {slot[side].tag} · {won ? (final ? 'Champions' : 'Through') : final ? 'Runner-up' : 'Out'}
                </span>
              </span>
              <span className={`poster text-2xl ${won ? '' : 'opacity-60'}`}>{side === 'a' ? slot.score : slot.against}</span>
            </span>
          )
        })}
      </button>
    )
  }

  // phones: one half of the draw. The first round is furthest from the final.
  const half = (side) => {
    const top = side === 0
    const rounds = columns.slice(0, last).map((slots, c) => ({ c, from: side * slots.length / 2, slots: slots.slice(side * slots.length / 2, (side + 1) * slots.length / 2) }))
    const title = <h3 className="label muted text-center py-1">{roundName(last)}</h3>
    return (
      <div aria-label={top ? 'Top half' : 'Bottom half'} role="group" className={`flex ${top ? 'flex-col' : 'flex-col-reverse'}`}>
        {title}
        {rounds.map(({ c, from, slots }) => (
          <ul key={c} className="grid grid-flow-col auto-cols-fr items-stretch">
            {slots.map((slot, k) => {
              const children = feeders(c, from + k)
              return (
                <li key={k} className={`flex px-1 ${top ? 'flex-col' : 'flex-col-reverse'}`}>
                  {children.length === 2 && (
                    <>
                      {/* the lines in from the two slots that feed this one */}
                      <span aria-hidden="true" className={`relative block h-5 -mx-1 ${top ? '' : '-scale-y-100'}`}>
                        <span className="absolute left-1/4 w-1/4 top-0 h-2.5 border-l-[3px] border-b-[3px]" style={line(route(children[0]))} />
                        <span className="absolute left-1/2 w-1/4 top-0 h-2.5 border-r-[3px] border-b-[3px]" style={line(route(children[1]))} />
                        <span className="absolute left-1/2 top-[7px] bottom-0 border-l-[3px]" style={line(route(slot))} />
                      </span>
                      <h3 className="label muted text-center py-1">{roundName(last - c)}</h3>
                    </>
                  )}
                  <div className="flex-1 flex items-center justify-center"><div className="w-full max-w-[15rem]">{match(slot, c, from + k)}</div></div>
                </li>
              )
            })}
          </ul>
        ))}
      </div>
    )
  }
  // the short straight line between a half and the final
  const join = (slot) => <span aria-hidden="true" className="block h-5 w-0 mx-auto border-l-[3px]" style={line(route(slot))} />

  return (
    <>
      {/* phones. shortcut: past eight parties the first round is wider than the screen and scrolls sideways,
          starting centred; fold those rounds if cups get that big */}
      <div className="md:hidden relative overflow-x-auto pb-1" ref={centre}>
        <div aria-label="Cup bracket" role="group" style={{ minWidth: `${Math.max(1, columns[0].length / 2) * 7}rem` }}>
          {last > 0 && <>{half(0)}{join(columns[last - 1][0])}</>}
          <h3 className="poster text-xl text-center mb-1">Final</h3>
          <div className="mx-auto w-full max-w-[17rem] px-1">{match(columns[last][0], last, 0)}</div>
          {last > 0 && <>{join(columns[last - 1][1])}{half(1)}</>}
        </div>
      </div>

      <div className="hidden md:block relative overflow-x-auto pb-1">
        <ol aria-label="Cup bracket" className="flex gap-5">
          {columns.map((slots, c) => (
            <li key={c} className="flex flex-col flex-1 min-w-[7.5rem]">
              <h3 className="label muted whitespace-nowrap mb-1">{roundName(last - c)}</h3>
              <ul className="flex-1 grid auto-rows-fr">
                {slots.map((slot, i) => {
                  const children = feeders(c, i)
                  return (
                    <li key={i} className="relative flex items-center py-1.5">
                      {/* the lines in from the two slots that feed this one */}
                      {children.length === 2 && (
                        <span aria-hidden="true">
                          <span className="absolute -left-5 w-2.5 top-1/4 h-1/4 border-t-[3px] border-r-[3px]" style={line(route(children[0]))} />
                          <span className="absolute -left-5 w-2.5 top-1/2 h-1/4 border-b-[3px] border-r-[3px]" style={line(route(children[1]))} />
                          <span className="absolute -left-2.5 w-2.5 top-1/2 border-t-[3px]" style={line(route(slot))} />
                        </span>
                      )}
                      {match(slot, c, i)}
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </>
  )
}
