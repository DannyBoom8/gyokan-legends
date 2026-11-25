'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rewardsDue } from '../lib/squad'
import { weekOf } from '../lib/guild-rules'
import SectionTabs, { SQUAD_TABS } from './FantasyTabs'

// the squad section's tabs, with a mark on Rewards while one is waiting
export default function SquadTabs({ active, compact }) {
  const [waiting, setWaiting] = useState(false)

  useEffect(() => {
    let current = true
    const look = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('squads').select('claimed_day, claimed_week').eq('user_id', session.user.id).maybeSingle()
      const due = rewardsDue(data, new Date().toISOString().slice(0, 10), weekOf())
      if (current) setWaiting(due.daily || due.weekly)
    }
    look()
    return () => { current = false }
  }, [])

  return <SectionTabs active={active} compact={compact} tabs={SQUAD_TABS} label="Squad" dot={waiting && active !== 'rewards' ? 'rewards' : undefined} />
}
