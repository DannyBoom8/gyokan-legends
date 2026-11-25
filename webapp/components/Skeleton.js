import { Screen, PageHead } from './Manga'
import { Wordmark } from './Logo'

export const Sk = ({ className = '', style }) => <div className={`skeleton ${className}`} style={style} />

// an empty panel, drawn like the real ones
const Box = ({ i, className }) => (
  <div className={`box p-1.5 ${className}`}><Sk className="w-full h-full" style={{ animationDelay: `${i * 80}ms` }} /></div>
)
const boxes = (n, className) => Array.from({ length: n }, (_, i) => <Box key={i} i={i} className={className} />)

const SHAPES = {
  list: <div className="flex flex-col gap-3">{boxes(6, 'h-20')}</div>,
  cards: <div className="grid gap-3 md:grid-cols-2">{boxes(4, 'h-40')}</div>,
  detail: <div className="flex flex-col gap-3"><Box i={0} className="h-72" />{boxes(2, 'h-24')}</div>,
  dashboard: (
    <div className="grid gap-3 lg:grid-cols-12">
      <Box i={0} className="h-56 lg:h-[34dvh] lg:col-span-8" /><Box i={1} className="h-56 lg:h-[34dvh] lg:col-span-4" />
      <Box i={2} className="h-44 lg:h-[30dvh] lg:col-span-8" /><Box i={3} className="h-44 lg:h-[30dvh] lg:col-span-4" />
      {boxes(4, 'h-20 lg:h-[11dvh] lg:col-span-3')}
    </div>
  ),
}

// Placeholders inside the same shell as the real page (header and navigation included), so nothing jumps when data lands.
// Give it the page's nav, title and width.
export default function PageSkeleton({ variant = 'list', nav, title, width }) {
  return (
    <Screen nav={nav} width={width} fit={variant === 'dashboard' ? 'desktop' : undefined}>
      {title ? <PageHead title={title} compact={nav === 'lineup' || nav === 'squad'} /> : (
        <div className="border-b-4 border-[var(--line)] pb-2 mb-3">
          {variant === 'dashboard' ? <Wordmark className="w-48 md:w-56" /> : <Sk className="h-10 w-48" />}
        </div>
      )}
      <div className="skeleton-wrap" role="status">
        <span className="sr-only">Loading</span>
        <div aria-hidden="true">{SHAPES[variant]}</div>
      </div>
    </Screen>
  )
}
