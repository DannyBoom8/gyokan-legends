'use client'
import { useRouter } from 'next/navigation'
import Icon from '../../components/Icon'
import { Screen, PageHead, Panel } from '../../components/Manga'
import { GAMES } from '../../lib/games'

export default function Games() {
  const router = useRouter()

  return (
    <Screen nav="games" width="max-w-4xl">
      <PageHead title="Games" sub="Play solo or with friends. No account needed." />

      <div className="flex flex-col gap-3">
        <Panel i={1} className="hov" pageClass="!bg-[#12100e] text-[#f3efe4]">
          <div className="tone absolute -z-10 inset-0" style={{ '--ink': '#f3efe4' }} aria-hidden="true" />
          <button onClick={() => router.push('/')} className="press w-full text-left p-5 flex items-center justify-between gap-4">
            <span>
              <span className="label block mb-2">Season game · Account</span>
              <span className="poster block text-3xl">Gyokan Legends</span>
              <span className="block text-sm mt-2 leading-relaxed">
                Draft 10 anime legends with 100M gold. Every Thursday they battle for points and rank.
              </span>
            </span>
            <Icon name="dragon" size={48} className="hov-icon shrink-0" />
          </button>
        </Panel>

        <div className="grid sm:grid-cols-3 gap-3">
          {GAMES.map((g, i) => (
            <Panel key={g.slug} i={i + 2} className="hov" pageClass="flex">
              <button onClick={() => router.push(`/games/${g.slug}`)} className="toc press w-full text-left p-4 flex flex-col gap-3">
                <span className="flex items-center justify-between gap-3">
                  <span className="poster text-2xl">{g.title}</span>
                  <Icon name={g.icon} size={28} className="hov-icon shrink-0" />
                </span>
                <span className="muted text-sm leading-relaxed flex-1">{g.blurb}</span>
                <span className="label muted">{g.tag}</span>
              </button>
            </Panel>
          ))}
        </div>
      </div>
    </Screen>
  )
}
