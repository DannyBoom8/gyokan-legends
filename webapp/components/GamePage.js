'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from './BottomNav'
import '../app/games/games.css'

// the engine is plain JS shared by all games; load it once and reuse it across client navigations
let engine
const loadEngine = () => engine || (engine = new Promise((resolve, reject) => {
  if (window.UXApps) return resolve(window.UXApps)
  const s = document.createElement('script')
  s.src = '/games/engine.js'
  s.onload = () => resolve(window.UXApps)
  s.onerror = () => { engine = null; reject(new Error('engine failed to load')) }
  document.head.appendChild(s)
}))

export default function GamePage({ game }) {
  const mount = useRef(null)
  const [failed, setFailed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const el = mount.current
    let alive = true
    loadEngine()
      .then(U => {
        if (!alive || !el) return
        el.replaceChildren() // dev strict mode runs effects twice
        U.tools[game.slug](el)
      })
      .catch(() => alive && setFailed(true))
    return () => { alive = false; el?.replaceChildren() }
  }, [game.slug])

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="px-5 pt-14 pb-5 max-w-3xl mx-auto enter">
        <button onClick={() => router.push('/games')} className="press text-zinc-500 text-sm mb-3 block">← Games</button>
        <p className="text-amber-500 text-xs uppercase tracking-wider mb-1">{game.tag}</p>
        <h1 className="text-2xl font-bold tracking-tight">{game.title}</h1>
        <p className="text-zinc-500 text-sm mt-1 leading-relaxed">{game.blurb}</p>
      </div>

      <div className="ux px-5 max-w-3xl mx-auto enter" data-theme="dark" style={{ '--i': 1 }}>
        {failed
          ? <p className="text-zinc-500 text-sm">This game couldn&apos;t load. Check your connection and refresh.</p>
          : <div ref={mount} className="ux-app" />}
      </div>

      <BottomNav active="games" />
    </div>
  )
}
