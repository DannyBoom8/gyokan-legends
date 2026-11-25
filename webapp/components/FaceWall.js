// decorative manga page of main characters: ink until the pointer finds one
const CDN = 'https://s4.anilist.co/file/anilistcdn/character/large/'
// rows of 8; the 4th and 5th of each row sit behind the sign-in card on wide screens
const FACES = [
  'b40-MNypXsxSRb1R.png', 'b17-phjcWCkRuIhu.png', 'b127691-9zqh1xpIubn7.png', 'b176754-PCnpqIOkjhFk.png', 'b127518-NRlq1CQ1v1ro.png', 'b45627-CR68RyZmddGG.png', 'b14-9Kb1E5oel1ke.png', 'b126071-BTNEc1nRIv68.png',
  'b62-S7oAeA9WInjV.png', 'b40882-dsj7IP943WFF.jpg', 'b27-Z5O02kQUydpT.jpg', 'b138100-4Li0tWRCa5bQ.png', 'b123285-tKijiuQErDS0.png', 'b80-26EhwSsSqQ50.png', 'b85-mkVBh2yjxjmx.png', 'b127212-FVm2tD0erQ5B.png',
  'b5-a7bkJgjhhigE.png', 'b13-SISLEw1oAD7a.png', 'b40881-F3gr1PkreDvj.png', 'b124381-pkTKi6HHNuVR.png', 'b88892-bdOha3lNcaN6.png', 'b130102-FO1VHNnEnLlB.png', 'b30-lyFExKyDhefc.jpg', 'b422-XTaiTuvRohsV.png',
  'b913-NIFkKazWM8VO.png', 'b11-TA5Nuk7EDUZG.jpg', 'b73935-ON5d0mAcrItd.jpg', 'b71-1W4panC53vfs.png', 'b87275-mb13EWZBdbh3.png', 'b89028-8w1I9o1ISHMg.png', 'b417-gVLmIJu9phcK.png', 'b137080-UHcynYNjb5ZU.png',
]

export default function FaceWall() {
  return (
    <div className="faces" aria-hidden="true">
      {FACES.map(file => (
        <span key={file} className="face">
          <img src={CDN + file} alt="" loading="lazy" decoding="async" draggable="false" />
        </span>
      ))}
    </div>
  )
}
