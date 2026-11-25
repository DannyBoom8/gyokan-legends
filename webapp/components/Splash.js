import { Wordmark } from './Logo'

// The opening screen. In the layout it plays on every full load and leaves by CSS alone, so it can never get stuck;
// with `hold` it stays until the page replaces it.
export default function Splash({ hold }) {
  return (
    <div className={`mg splash ${hold ? '' : 'splash-out'}`} role="status">
      <Wordmark className="splash-name" />
      <span className="load-bar" aria-hidden="true"><span /></span>
    </div>
  )
}
