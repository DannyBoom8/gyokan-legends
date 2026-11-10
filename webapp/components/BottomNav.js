'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function BottomNav({ active }) {
  const [showMore, setShowMore] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const tabs = [
    { id: 'dashboard', label: 'Home', path: '/dashboard', icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { id: 'party', label: 'Party', path: '/party', icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )},
    { id: 'battles', label: 'Battles', path: '/battles', icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
        <path d="M13 19l6-6"/>
        <path d="M16 16l4 4"/>
        <path d="M19 21l2-2"/>
      </svg>
    )},
    { id: 'games', label: 'Games', path: '/games', icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="11" rx="5"/>
        <path d="M7 11v3M5.5 12.5h3" stroke={a ? 'black' : 'currentColor'}/>
        <circle cx="15.5" cy="12" r="0.75" fill={a ? 'black' : 'currentColor'} stroke="none"/>
        <circle cx="17.5" cy="14" r="0.75" fill={a ? 'black' : 'currentColor'} stroke="none"/>
      </svg>
    )},
    { id: 'more', label: 'More', path: null, icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="19" cy="12" r="2"/>
      </svg>
    )},
  ]

  const moreItems = [
    { id: 'characters', label: 'Characters', emoji: '🎴', path: '/characters' },
    { id: 'points', label: 'Points', emoji: '📊', path: '/points' },
    { id: 'leaderboard', label: 'Leaderboard', emoji: '🏆', path: '/leaderboard' },
    { id: 'rules', label: 'How to play', emoji: '📜', path: '/rules' },
  ]

  return (
    <>
      {showMore && (
        <div className="scrim fixed inset-0 z-40 bg-black/50" onClick={() => setShowMore(false)}>
          <div className="menu-pop absolute right-4 w-60 bottom-[calc(5rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
            <div className="material bg-zinc-900/80 backdrop-blur-xl backdrop-saturate-150 border border-white/10 rounded-[20px] p-1.5 shadow-2xl">
              {moreItems.map(item => (
                <button key={item.label}
                  onClick={() => { router.push(item.path); setShowMore(false) }}
                  aria-current={active === item.id ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] transition-colors duration-150 active:bg-white/10 ${active === item.id ? 'bg-white/[0.06]' : ''}`}>
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-white text-sm">{item.label}</span>
                </button>
              ))}
              <div className="h-px bg-white/10 mx-3 my-1" />
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] transition-colors duration-150 active:bg-white/10">
                <span className="text-lg">🚪</span>
                <span className="text-red-400 text-sm font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="material fixed bottom-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-xl backdrop-saturate-150 border-t border-white/[0.06]">
        <div className="flex items-center pb-safe">
          {tabs.map(tab => {
            const isActive = active === tab.id || (tab.id === 'more' && (showMore || moreItems.some(m => m.id === active)))
            return (
              <button key={tab.id}
                aria-current={active === tab.id ? 'page' : undefined}
                aria-expanded={tab.id === 'more' ? showMore : undefined}
                onClick={() => {
                  if (tab.id === 'more') { setShowMore(prev => !prev); return }
                  setShowMore(false)
                  router.push(tab.path)
                }}
                className={`press flex-1 flex flex-col items-center gap-1 py-3 ${isActive ? 'text-amber-500' : 'text-zinc-500'}`}>
                {tab.icon(isActive)}
                <span className="text-xs">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}