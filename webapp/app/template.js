// A template remounts on every navigation, so each page eases in instead of snapping.
export default function Template({ children }) {
  return <div className="page-in">{children}</div>
}
