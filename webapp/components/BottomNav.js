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
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { id: 'party', label: 'Party', path: '/party', icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )},
    { id: 'battles', label: 'Battles', path: '/battles', icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
        <path d="M13 19l6-6"/>
        <path d="M16 16l4 4"/>
        <path d="M19 21l2-2"/>
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
    { label: 'Points', emoji: '📊', path: '/points', coming: false },
    { label: 'Settings', emoji: '⚙️', path: null, coming: true },
    { label: 'Support', emoji: '💬', path: null, coming: true },
  ]

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-20 left-4 right-4" onClick={e => e.stopPropagation()}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              {moreItems.map(item => (
                <button key={item.label}
                  onClick={() => {
                    if (item.path) { router.push(item.path); setShowMore(false) }
                  }}
                  disabled={item.coming}
                  className="w-full flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 active:bg-zinc-800 disabled:opacity-40">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-white text-sm">{item.label}</span>
                  </div>
                  {item.coming && <span className="text-zinc-600 text-xs">Coming soon</span>}
                </button>
              ))}
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-4 active:bg-zinc-800">
                <span className="text-lg">🚪</span>
                <span className="text-red-400 text-sm font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-zinc-900 backdrop-blur-sm">
        <div className="flex items-center pb-safe">
          {tabs.map(tab => {
            const isActive = active === tab.id || (tab.id === 'more' && showMore)
            return (
              <button key={tab.id}
                onClick={() => {
                  if (tab.id === 'more') { setShowMore(prev => !prev); return }
                  setShowMore(false)
                  router.push(tab.path)
                }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isActive ? 'text-amber-500' : 'text-zinc-600'}`}>
                {tab.icon(isActive)}
                <span className="text-xs">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}