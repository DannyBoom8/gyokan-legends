'use client'
import { useRouter } from 'next/navigation'
import { Panel } from './Manga'

// the other squad pages need a squad first
export default function NoSquad() {
  const router = useRouter()
  return (
    <Panel i={1} pageClass="flex flex-wrap items-center gap-3 p-4">
      <p className="flex-1 min-w-[12rem] text-sm">Pick your starting cards first.</p>
      <button onClick={() => router.push('/squad')} className="btn-spot text-lg px-5 py-2.5">Start your squad</button>
    </Panel>
  )
}
