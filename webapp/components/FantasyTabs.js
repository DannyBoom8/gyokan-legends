'use client'
import Link from 'next/link'

// the fantasy league's pages; the ids are the `nav` value each page gives <Screen>
export const FANTASY_TABS = [
  { id: 'lineup', label: 'Lineup', path: '/lineup' },
  { id: 'battles', label: 'Battles', path: '/battles' },
  { id: 'leaderboard', label: 'Ranks', path: '/leaderboard' },
  { id: 'points', label: 'Points', path: '/points' },
  { id: 'characters', label: 'Scout', path: '/characters' },
  { id: 'rules', label: 'Rules', path: '/rules' },
]
export const isFantasy = (nav) => FANTASY_TABS.some(t => t.id === nav)

export default function FantasyTabs({ active, compact }) {
  return (
    <nav aria-label="Fantasy" className={`flex gap-1 sm:gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
      {FANTASY_TABS.map(t => (
        <Link key={t.id} href={t.path} aria-current={active === t.id ? 'page' : undefined}
          className={`btn bg-[var(--panel)] flex-auto sm:flex-none text-center whitespace-nowrap text-xs min-[360px]:text-sm sm:text-lg px-0.5 min-[360px]:px-1 sm:px-4 ${compact ? 'py-2' : 'py-2.5'}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
