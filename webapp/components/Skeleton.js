// Placeholders shaped like the real screens, so the layout doesn't jump when data lands.
export const Sk = ({ className = '', style }) => <div className={`skeleton ${className}`} style={style} />

const Head = () => (
  <div className="px-5 pt-14 pb-6 max-w-3xl mx-auto">
    <Sk className="h-3 w-24 mb-3" />
    <Sk className="h-8 w-48" />
  </div>
)

const Rows = ({ n, h = 'h-16' }) => (
  <div className="px-5 max-w-3xl mx-auto flex flex-col gap-3">
    {Array.from({ length: n }, (_, i) => <Sk key={i} className={`${h} rounded-2xl`} style={{ animationDelay: `${i * 80}ms` }} />)}
  </div>
)

export default function PageSkeleton({ variant = 'list' }) {
  return (
    <div className="skeleton-wrap min-h-screen bg-black pb-28" role="status" aria-label="Loading">
      <Head />
      {variant === 'dashboard' && (
        <>
          <div className="mx-5 mb-4 max-w-3xl"><Sk className="h-52 rounded-[28px]" /></div>
          <Rows n={2} h="h-24" />
          <div className="px-5 mt-3 grid grid-cols-2 gap-3 max-w-3xl"><Sk className="h-28 rounded-2xl" /><Sk className="h-28 rounded-2xl" /></div>
        </>
      )}
      {variant === 'list' && <Rows n={6} />}
      {variant === 'cards' && <Rows n={3} h="h-28" />}
      {variant === 'detail' && (
        <div className="px-5 max-w-3xl mx-auto">
          <Sk className="h-64 rounded-[28px] mb-4" />
          <Sk className="h-24 rounded-2xl mb-3" />
          <Sk className="h-24 rounded-2xl" />
        </div>
      )}
      <span className="sr-only">Loading</span>
    </div>
  )
}
