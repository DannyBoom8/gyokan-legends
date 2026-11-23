// Light / dark / auto. The pre-paint script in app/layout.js applies the saved mode on load;
// this applies changes. Mode is stored as 'light' | 'dark' | 'auto' (auto follows the device).
const KEY = 'gyokan-theme'
const query = () => window.matchMedia('(prefers-color-scheme: light)')

export const getMode = () => {
  try { return localStorage.getItem(KEY) || 'auto' } catch { return 'auto' }
}

const resolve = (mode) => (mode === 'auto' ? (query().matches ? 'light' : 'dark') : mode)

export function applyMode(mode) {
  const root = document.documentElement
  root.classList.add('theme-switching')
  root.dataset.mode = mode
  root.dataset.theme = resolve(mode)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', root.dataset.theme === 'light' ? '#ffffff' : '#000000')
  void root.offsetHeight // let the swap paint before transitions come back
  requestAnimationFrame(() => root.classList.remove('theme-switching'))
}

const listeners = new Set()
export function setMode(mode) {
  try { localStorage.setItem(KEY, mode) } catch {}
  applyMode(mode)
  listeners.forEach(l => l())
}

export function subscribe(cb) {
  listeners.add(cb)
  const mq = query()
  const onSystem = () => { if (getMode() === 'auto') { applyMode('auto'); cb() } }
  mq.addEventListener('change', onSystem)
  return () => { listeners.delete(cb); mq.removeEventListener('change', onSystem) }
}
