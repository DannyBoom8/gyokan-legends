'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { isDemo, runDemoBattle } from '../lib/demo'
import Icon from './Icon'
import { Wordmark } from './Logo'
import ThemeToggle from './ThemeToggle'
import { isFantasy } from './FantasyTabs'

const noop = () => () => {}

export default function BottomNav({ active: page }) {
  const active = isFantasy(page) ? 'fantasy' : page
  const [showMore, setShowMore] = useState(false)
  const router = useRouter()
  const demo = useSyncExternalStore(noop, isDemo, () => false)
  const [battling, setBattling] = useState(false)
  const runBattle = async () => { setBattling(true); await runDemoBattle(); window.location.reload() }

  useEffect(() => { document.body.classList.add('has-sidebar'); return () => document.body.classList.remove('has-sidebar') }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const tabs = [
    { id: 'dashboard', label: 'Home', path: '/dashboard', icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { id: 'squad', label: 'Squad', path: '/squad', icon: () => <Icon name="flame" size={24} /> },
    { id: 'guild', label: 'Guild', path: '/guild', icon: () => <Icon name="shield" size={24} /> },
    { id: 'fantasy', label: 'Fantasy', path: '/lineup', icon: () => <Icon name="medal" size={24} /> },
    { id: 'more', label: 'More', path: null, icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="19" cy="12" r="2"/>
      </svg>
    )},
  ]

  const moreItems = [
    { id: 'nakama', label: 'Nakama', icon: 'users', path: '/nakama' },
    { id: 'games', label: 'Games', icon: 'gamepad', path: '/games' },
  ]

  const action = 'mn-item w-full flex items-center gap-4 px-5 py-3 text-left disabled:opacity-50'

  return (
    <>
      <aside className="mn mn-side hidden md:flex fixed inset-y-0 left-0 z-40 w-60 flex-col overflow-y-auto">
        <div className="px-5 pt-6 pb-5"><Wordmark className="w-full" /></div>
        <nav className="flex-1 flex flex-col" aria-label="Main">
          {[...tabs.filter(t => t.path), ...moreItems].map(item => {
            const on = active === item.id
            return (
              <button key={item.id} onClick={() => router.push(item.path)} aria-current={on ? 'page' : undefined}
                className="mn-item press flex-1 min-h-[2.375rem] max-h-16 flex items-center gap-4 px-5 text-left">
                {typeof item.icon === 'function' ? item.icon(on) : <Icon name={item.icon} size={24} />}
                <span className="mn-text text-xl">{item.full || item.label}</span>
              </button>
            )
          })}
        </nav>
        {/* native disclosure: closed until asked for */}
        <details className="group pb-2">
          <summary className="mn-item flex items-center gap-4 px-5 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <Icon name="gear" size={22} /><span className="mn-text text-lg flex-1">Settings</span>
            {demo && <span className="label !text-[0.625rem] bg-[var(--spot)] text-white px-2 py-1">Demo</span>}
          </summary>
          <div className="flex flex-col gap-1 pt-1">
            <div className="px-3 py-1"><ThemeToggle /></div>
            {demo && (
              <button onClick={runBattle} disabled={battling} className={action}>
                <Icon name="swords" size={22} /><span className="mn-text text-lg">{battling ? 'Battling…' : 'Battle night'}</span>
              </button>
            )}
            <button onClick={handleLogout} className={action}>
              <Icon name="logout" size={22} /><span className="mn-text text-lg">{demo ? 'Exit demo' : 'Log out'}</span>
            </button>
          </div>
        </details>
      </aside>

      {showMore && (
        <div className="scrim md:hidden fixed inset-0 z-40 bg-[rgb(0_0_0/0.65)]" onClick={() => setShowMore(false)}>
          <div className="mn menu-pop absolute right-3 w-60 bottom-[calc(5.25rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
            <div className="mn-sheet flex flex-col py-2">
              {moreItems.map(item => (
                <button key={item.id} onClick={() => { router.push(item.path); setShowMore(false) }}
                  aria-current={active === item.id ? 'page' : undefined} className={action}>
                  <Icon name={item.icon} size={22} />
                  <span className="mn-text text-lg">{item.label}</span>
                </button>
              ))}
              <div className="px-3 py-1"><ThemeToggle /></div>
              {demo && (
                <button onClick={runBattle} disabled={battling} className={action}>
                  <Icon name="swords" size={22} /><span className="mn-text text-lg">{battling ? 'Battling…' : 'Battle night'}</span>
                </button>
              )}
              <button onClick={handleLogout} className={action}>
                <Icon name="logout" size={22} /><span className="mn-text text-lg">{demo ? 'Exit demo' : 'Log out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {demo && (
        <p className="label md:hidden fixed top-3 right-3 z-50 bg-[var(--spot)] text-white px-3 py-1.5 !text-[0.6875rem] pointer-events-none">Demo</p>
      )}
      <nav className="mn mn-bar md:hidden fixed bottom-0 left-0 right-0 z-50" aria-label="Main">
        <div className="flex items-stretch pb-safe">
          {tabs.map(tab => {
            const isActive = active === tab.id || (tab.id === 'more' && (showMore || moreItems.some(m => m.id === active)))
            return (
              <button key={tab.id}
                aria-current={active === tab.id ? 'page' : undefined}
                aria-label={tab.full}
                aria-expanded={tab.id === 'more' ? showMore : undefined}
                data-on={isActive}
                onClick={() => {
                  if (tab.id === 'more') { setShowMore(prev => !prev); return }
                  setShowMore(false)
                  router.push(tab.path)
                }}
                className="mn-item press flex-1 min-w-0 flex flex-col items-center gap-1.5 py-3">
                {tab.icon(isActive)}
                <span className="mn-text text-xs min-[400px]:text-sm">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
