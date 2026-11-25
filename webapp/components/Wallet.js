// what I have to spend, shown beside a squad page's title
export default function Wallet({ items }) {
  return (
    <div className="flex items-center gap-1.5">
      {items.map(([amount, word]) => <p key={word} className="label border-2 border-[var(--line)] px-2 py-2">{amount} {word}</p>)}
    </div>
  )
}
