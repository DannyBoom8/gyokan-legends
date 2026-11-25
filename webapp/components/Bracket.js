'use client'
import { bracketColumns } from '../lib/squad'

export const roundName = (fromEnd) => ['Final', 'Semi-finals', 'Quarter-finals'][fromEnd] || `Last ${2 ** (fromEnd + 1)}`

// a cup as a tree: first round on the left, the final on the right. The champions' route is drawn in red,
// beaten parties are struck out, and tapping a match picks it (`shown` is "round-place").
export default function Bracket({ cup, shown, onPick }) {
  const columns = bracketColumns(cup.rounds)
  const champion = cup.champion.party_id
  // did the champions come through this slot?
  const route = (slot) => (slot.bye || slot[slot.winner]).party_id === champion
  const line = (hot) => ({ borderColor: hot ? 'var(--spot)' : 'color-mix(in oklab, var(--ink) 35%, transparent)' })

  return (
    <div className="relative overflow-x-auto pb-1">
      <ol aria-label="Cup bracket" className="flex gap-5">
        {columns.map((slots, c) => {
          const final = c === columns.length - 1
          return (
            <li key={c} className="flex flex-col flex-1 min-w-[7.5rem]">
              <h3 className="label muted whitespace-nowrap mb-1">{roundName(columns.length - 1 - c)}</h3>
              <ul className="flex-1 grid auto-rows-fr">
                {slots.map((slot, i) => {
                  const id = `${c}-${i}`
                  const children = c ? columns[c - 1].slice(i * 2, i * 2 + 2) : []
                  return (
                    <li key={id} className="relative flex items-center py-1.5">
                      {/* the lines in from the two slots that feed this one */}
                      {children.length === 2 && (
                        <span aria-hidden="true">
                          <span className="absolute -left-5 w-2.5 top-1/4 h-1/4 border-t-[3px] border-r-[3px]" style={line(route(children[0]))} />
                          <span className="absolute -left-5 w-2.5 top-1/2 h-1/4 border-b-[3px] border-r-[3px]" style={line(route(children[1]))} />
                          <span className="absolute -left-2.5 w-2.5 top-1/2 border-t-[3px]" style={line(route(slot))} />
                        </span>
                      )}
                      {slot.bye ? (
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
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
