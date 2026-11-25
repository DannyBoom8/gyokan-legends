'use client'
import { createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import FantasyTabs, { isFantasy } from './FantasyTabs'
import BottomNav from './BottomNav'
import Icon from './Icon'
import { Wordmark } from './Logo'

const Nav = createContext(null)

// the page itself: manga background, safe-area spacing and (optionally) the navigation.
// fit: 'always' pins the page to one screen; 'desktop' does so on large screens only (see manga.css)
export function Screen({ nav, width = 'max-w-6xl', fit, children }) {
  const pinned = fit === 'always'
  return (
    <div className={`mg overflow-x-clip ${pinned
      ? 'h-dvh overflow-hidden flex flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-3'
      : `min-h-screen pb-28 md:pb-10 ${fit === 'desktop' ? 'fit-desktop' : ''}`}`}>
      <div className={`shell ${width} w-full mx-auto px-3 md:px-5 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:pt-4 ${pinned ? 'flex-1 min-h-0 flex flex-col' : ''}`}><Nav value={nav}>{children}</Nav></div>
      {nav && <BottomNav active={nav} />}
    </div>
  )
}

// phones get the logo above the title; from md up the sidebar carries it
export function PageHead({ title, sub, aside, back, backLabel = 'Back', compact }) {
  const router = useRouter()
  const nav = useContext(Nav)
  return (
    <header className={`arrive ${compact ? 'mb-2' : 'mb-3'}`}>
      <div className={`md:hidden border-b-4 border-[var(--line)] ${compact ? 'pb-1.5 mb-1.5 [@media(max-height:700px)]:hidden' : 'pb-2 mb-3'}`}><Wordmark className={compact ? 'w-28' : 'w-48'} /></div>
      {back && (
        <button onClick={() => (back === true ? router.back() : router.push(back))} className="press label muted flex items-center gap-1.5 min-h-9 mb-1">
          <Icon name="back" size={16} /> {backLabel}
        </button>
      )}
      <div className={`flex flex-wrap items-end justify-between gap-x-3 gap-y-2 md:border-b-4 md:border-[var(--line)] ${compact ? 'md:pb-2' : 'md:pb-3'}`}>
        <div className="min-w-0">
          <h1 className={`poster ${compact ? 'text-3xl' : 'text-4xl md:text-5xl'}`}>{title}</h1>
          {sub && <p className="muted text-sm mt-2">{sub}</p>}
        </div>
        {aside}
      </div>
      {isFantasy(nav) && <div className={compact ? 'mt-2 -mb-2' : 'mt-3 -mb-3'}><FantasyTabs active={nav} compact={compact} /></div>}
    </header>
  )
}

export function Panel({ i, className = '', pageClass = '', children }) {
  return (
    <section className={`arrive panel ${className}`} style={{ '--i': i }}>
      <div className={`page ${pageClass}`}>{children}</div>
    </section>
  )
}

export function Caption({ children, aside }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <h2 className="caption poster text-xl">{children}</h2>
      {aside && <span className="label muted pr-4">{aside}</span>}
    </header>
  )
}
