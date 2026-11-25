// One outline icon set, 1.5 stroke to match regular-weight text. Colour comes from currentColor.
const PATHS = {
  cards: <><rect x="3" y="6" width="11" height="15" rx="2.5" /><path d="M8 3.5h10.5A2.5 2.5 0 0 1 21 6v11" /><path d="M6.5 12.5h4M6.5 16h2.5" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  trophy: <><path d="M8 4h8v6a4 4 0 0 1-8 0z" /><path d="M8 6H4v1a3 3 0 0 0 3 3M16 6h4v1a3 3 0 0 1-3 3" /><path d="M12 14v4M8.5 20h7" /></>,
  scroll: <><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1z" /><path d="M9 8h7M9 12h7M9 16h4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  swords: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4M19 21l2-2" /><path d="M9.5 6.5L21 18v3h-3L6.5 9.5" /></>,
  flame: <><path d="M12 22c4 0 7-2.8 7-6.7 0-2.3-1-4-2.4-5.6-.6 1.4-1.6 2-2.6 2 .6-3.4-.8-6.2-3.5-8.7-.3 3-1.8 4.6-3.2 6.3C5.9 11.7 5 13.2 5 15.3 5 19.2 8 22 12 22z" /></>,
  crown: <><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></>,
  bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></>,
  medal: <><circle cx="12" cy="15" r="6" /><path d="M8.5 9.6L6 3h4l2 4.5M15.5 9.6L18 3h-4l-2 4.5" /></>,
  gamepad: <><rect x="2" y="7" width="20" height="11" rx="5" /><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M17.5 14h.01" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  back: <><path d="M19 12H5M11 6l-6 6 6 6" /></>,
  letters: <><path d="M4 19l5-14 5 14M5.8 14h6.4" /><path d="M16 9h4.5M16 14h4.5M16 19h4.5" /></>,
  mask: <><path d="M4 6c5 2 11 2 16 0v6c0 4.5-3.6 8-8 8s-8-3.5-8-8z" /><path d="M8 11l2 1M16 11l-2 1M9.5 15.5c1.4 1 3.6 1 5 0" /></>,
  theater: <><path d="M4 4h10v8a5 5 0 0 1-10 0z" /><path d="M7 8.5h.01M11 8.5h.01M6.8 12.5c1.3 1.2 3.1 1.2 4.4 0" /><path d="M14 8h6v7a5 5 0 0 1-8.5 3.5" /></>,
  dragon: <><path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.2l5-.7z" /><path d="M12 21v-2.5" /></>,
  swords2: <><path d="M5 19L19 5M15 5h4v4M5 5l4 4" /></>,
}

export default function Icon({ name, size = 20, className = '', filled = false, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={className} style={style}>
      {PATHS[name]}
    </svg>
  )
}

// Rounded tile that holds an icon; hover tilt comes from the parent's `.tile` class.
export function IconTile({ name, size = 22, className = '', tone = 'text-amber-500', index = 0 }) {
  return (
    <div className={`tile-icon w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center ${tone} ${className}`}>
      <Icon name={name} size={size} className="icon-in" style={{ '--i': index }} />
    </div>
  )
}
