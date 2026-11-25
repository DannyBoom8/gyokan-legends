'use client'
import { useEffect, useRef } from 'react'

// native dialog: focus trapping and Escape come for free
export default function AvatarPicker({ open, list, current, error, onPick, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()}
      aria-labelledby="avatar-title" className="picker">
      <div className="flex items-center justify-between gap-3 p-4 border-b-[3px] border-current">
        <h2 id="avatar-title" className="poster text-2xl">Choose your picture</h2>
        <button onClick={onClose} className="label border-2 border-current px-3 py-2">Close</button>
      </div>
      {error && <p role="alert" className="px-4 pt-3 text-sm font-semibold" style={{ color: 'var(--spot-text)' }}>{error}</p>}
      <ul className="grid grid-cols-3 sm:grid-cols-5 gap-3 p-4 overflow-y-auto">
        {list.map(c => (
          <li key={c.character_id}>
            <button onClick={() => onPick(c.character_id)} aria-pressed={current === c.character_id}
              className="art w-full text-left">
              <span className={`block overflow-hidden border-[3px] ${current === c.character_id ? 'border-[var(--spot)]' : 'border-current'}`}>
                <img src={c.image_url} alt="" loading="lazy" className="block w-full aspect-[3/4] object-cover object-top" />
              </span>
              <span className="block text-xs font-semibold mt-1 leading-tight">{c.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  )
}
