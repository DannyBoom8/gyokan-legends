'use client'
import { useSyncExternalStore } from 'react'
import { getMode, setMode, subscribe } from '../lib/theme'

const MODES = [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']]

export default function ThemeToggle({ className = '' }) {
  const mode = useSyncExternalStore(subscribe, getMode, () => 'auto')
  return (
    <div role="radiogroup" aria-label="Appearance" className={`flex bg-zinc-800 p-1 ${className}`}>
      {MODES.map(([id, label]) => (
        <button key={id} role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
          className={`label !text-[0.75rem] flex-1 py-2 transition-colors duration-150 ${mode === id ? 'bg-amber-500 text-on-accent' : 'text-zinc-500'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}
