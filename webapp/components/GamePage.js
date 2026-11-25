'use client'
import { useEffect, useRef, useState } from 'react'
import { Screen, PageHead } from './Manga'
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
    <Screen nav="games" width="max-w-3xl">
      <PageHead title={game.title} sub={game.blurb} back="/games" backLabel="Games" />

      <div className="ux box arrive p-3 sm:p-5" style={{ '--i': 1 }}>
        {failed
          ? <p className="muted text-sm">This game couldn&apos;t load. Check your connection and refresh.</p>
          : <div ref={mount} className="ux-app" />}
      </div>
    </Screen>
  )
}
