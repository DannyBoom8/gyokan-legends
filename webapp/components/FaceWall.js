'use client'
import { useEffect, useRef, useState } from 'react'

// decorative manga page of main characters: ink until the pointer finds one
const CDN = 'https://s4.anilist.co/file/anilistcdn/character/large/'
const SWAP_MS = 800 // one face changes at a time
// the opening page, rows of 8; the 4th and 5th of each row sit behind the sign-in card on wide screens
const FACES = [
  'b40-MNypXsxSRb1R.png', 'b17-phjcWCkRuIhu.png', 'b127691-9zqh1xpIubn7.png', 'b176754-PCnpqIOkjhFk.png', 'b127518-NRlq1CQ1v1ro.png', 'b45627-CR68RyZmddGG.png', 'b14-9Kb1E5oel1ke.png', 'b126071-BTNEc1nRIv68.png',
  'b62-S7oAeA9WInjV.png', 'b40882-dsj7IP943WFF.jpg', 'b27-Z5O02kQUydpT.jpg', 'b138100-4Li0tWRCa5bQ.png', 'b123285-tKijiuQErDS0.png', 'b80-26EhwSsSqQ50.png', 'b85-mkVBh2yjxjmx.png', 'b127212-FVm2tD0erQ5B.png',
  'b5-a7bkJgjhhigE.png', 'b13-SISLEw1oAD7a.png', 'b40881-F3gr1PkreDvj.png', 'b124381-pkTKi6HHNuVR.png', 'b88892-bdOha3lNcaN6.png', 'b130102-FO1VHNnEnLlB.png', 'b30-lyFExKyDhefc.jpg', 'b422-XTaiTuvRohsV.png',
  'b913-NIFkKazWM8VO.png', 'b11-TA5Nuk7EDUZG.jpg', 'b73935-ON5d0mAcrItd.jpg', 'b71-1W4panC53vfs.png', 'b87275-mb13EWZBdbh3.png', 'b89028-8w1I9o1ISHMg.png', 'b417-gVLmIJu9phcK.png', 'b137080-UHcynYNjb5ZU.png',
]

export default function FaceWall() {
  // each panel holds [current], or [previous, current] so the new face can fade in over the old one
  const [panels, setPanels] = useState(() => FACES.map(file => [file]))
  const wall = useRef(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const shown = [...FACES]
    const queue = []
    let timer, live = true

    const swap = () => {
      if (document.hidden) return
      const free = [...wall.current.children].filter(el => el.offsetParent && !el.matches(':hover'))
      const el = free[Math.floor(Math.random() * free.length)]
      const file = el && queue.shift()
      if (!file) return
      const i = [...wall.current.children].indexOf(el)
      const img = new Image()
      // swap only once the picture has arrived; a broken one is simply dropped
      img.onload = () => {
        if (!live) return
        if (el.matches(':hover')) return queue.unshift(file)
        queue.push(shown[i])
        shown[i] = file
        setPanels(all => all.map((p, n) => n === i ? [p[p.length - 1], file] : p))
      }
      img.src = CDN + file
    }

    // every other main character takes a turn; if the list fails to load, the opening page stays
    fetch('/demo/characters.json').then(r => r.json()).then(list => {
      if (!live) return
      const rest = list
        .filter(c => c.role === 'MAIN' && c.image_url?.startsWith(CDN) && !c.image_url.includes('default'))
        .map(c => c.image_url.slice(CDN.length))
        .filter(file => !FACES.includes(file))
      for (let n = rest.length - 1; n > 0; n--) {
        const m = Math.floor(Math.random() * (n + 1))
        ;[rest[n], rest[m]] = [rest[m], rest[n]]
      }
      queue.push(...rest)
      timer = setInterval(swap, SWAP_MS)
    }).catch(() => {})

    return () => { live = false; clearInterval(timer) }
  }, [])

  return (
    <div className="faces" aria-hidden="true" ref={wall}>
      {panels.map((files, i) => (
        <span key={i} className="face">
          {files.map(file => <img key={file} src={CDN + file} alt="" loading="lazy" decoding="async" draggable="false" />)}
        </span>
      ))}
    </div>
  )
}
