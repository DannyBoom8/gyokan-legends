'use client'
import Link from 'next/link'

// the fantasy league's pages; the ids are the `nav` value each page gives <Screen>
export const FANTASY_TABS = [
  { id: 'lineup', label: 'Lineup', path: '/lineup' },
  { id: 'battles', label: 'Results', path: '/battles' },
  { id: 'leaderboard', label: 'Ranks', path: '/leaderboard' },
  { id: 'points', label: 'Points', path: '/points' },
  { id: 'characters', label: 'Scout', path: '/characters' },
  { id: 'rules', label: 'Rules', path: '/rules' },
]
export const isFantasy = (nav) => FANTASY_TABS.some(t => t.id === nav)

export const SQUAD_TABS = [
  { id: 'squad', label: 'Squad', path: '/squad' },
  { id: 'cards', label: 'Cards', path: '/cards' },
  { id: 'market', label: 'Market', path: '/market' },
  { id: 'rewards', label: 'Rewards', path: '/rewards' },
]
export const isSquad = (nav) => SQUAD_TABS.some(t => t.id === nav)

// the tabs of one section; `dot` marks the tab that has something waiting
export default function SectionTabs({ active, compact, tabs = FANTASY_TABS, label = 'Fantasy', dot }) {
  return (
    <nav aria-label={label} className={`flex gap-1 sm:gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
      {tabs.map(t => (
        <Link key={t.id} href={t.path} aria-current={active === t.id ? 'page' : undefined}
          className={`btn relative bg-[var(--panel)] flex-auto sm:flex-none text-center whitespace-nowrap text-xs min-[360px]:text-sm sm:text-lg px-0.5 min-[360px]:px-1 sm:px-4 ${compact ? 'py-2' : 'py-2.5'}`}>
          {dot === t.id && <><span aria-hidden="true" className="absolute right-1 top-1 w-2 h-2 bg-[var(--spot)] border border-[#fff]" /><span className="sr-only">Something waiting: </span></>}
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
